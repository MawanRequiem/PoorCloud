package tunnel

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sync"
	"time"
	"localcloud/engine/core"
)

var (
	tunnelMu     sync.Mutex
	tunnelStatus = "DISCONNECTED"
	publicURL    = ""
	cancelFunc   context.CancelFunc
	tunnelCmd    *exec.Cmd
)

// findCloudflared locates the cloudflared executable.
func findCloudflared() (string, error) {
	// 1. Look in system PATH
	if path, err := exec.LookPath("cloudflared"); err == nil {
		return path, nil
	}

	// 2. Check in app data local bin directory
	appDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	binaryName := "cloudflared"
	if runtime.GOOS == "windows" {
		binaryName = "cloudflared.exe"
	}
	localPath := filepath.Join(appDir, "localcloud", "bin", binaryName)
	if _, err := os.Stat(localPath); err == nil {
		return localPath, nil
	}

	return "", errors.New("cloudflared binary not found in PATH or local app bin folder")
}

// StartTunnel starts the Cloudflare tunnel process for a given port, with auto-reconnect.
func StartTunnel(ctx context.Context, localPort int, onStatus func(status, url string, err error)) error {
	tunnelMu.Lock()
	defer tunnelMu.Unlock()

	if tunnelStatus == "CONNECTED" || tunnelStatus == "CONNECTING" {
		return fmt.Errorf("tunnel already running or connecting")
	}

	tunnelStatus = "CONNECTING"
	publicURL = ""
	onStatus(tunnelStatus, "", nil)

	runCtx, cancel := context.WithCancel(ctx)
	cancelFunc = cancel

	go func() {
		defer func() {
			tunnelMu.Lock()
			tunnelStatus = "DISCONNECTED"
			publicURL = ""
			tunnelMu.Unlock()
			onStatus("DISCONNECTED", "", nil)
		}()

		maxAttempts := 5
		for attempt := 0; attempt < maxAttempts; attempt++ {
			if runCtx.Err() != nil {
				return
			}

			if attempt > 0 {
				tunnelMu.Lock()
				tunnelStatus = "RECONNECTING"
				tunnelMu.Unlock()
				onStatus("RECONNECTING", "", fmt.Errorf("connection drop detected, reconnecting attempt %d/%d", attempt, maxAttempts))
				
				// Exponential backoff: 1s, 2s, 4s, 8s, 16s
				select {
				case <-runCtx.Done():
					return
				case <-time.After(time.Duration(1<<attempt) * time.Second):
				}
			}

			err := startCloudflaredProcess(runCtx, localPort, onStatus)
			if err == nil {
				// Clean exit requested by cancel
				return
			}

			// If it exited with error, loop to retry
			fmt.Printf("[Tunnel] cloudflared exited with error: %v\n", err)
		}

		tunnelMu.Lock()
		tunnelStatus = "FAILED"
		tunnelMu.Unlock()
		onStatus("FAILED", "", fmt.Errorf("exhausted %d reconnection attempts", maxAttempts))
	}()

	return nil
}

func startCloudflaredProcess(ctx context.Context, localPort int, onStatus func(status, url string, err error)) error {
	binPath, err := findCloudflared()
	if err != nil {
		return err
	}

	args := []string{"tunnel", "--url", fmt.Sprintf("http://localhost:%d", localPort)}
	
	// Create command context
	cmd := exec.CommandContext(ctx, binPath, args...)

	// Configure platform-specific attributes to protect against zombies
	core.SetPlatformSysProcAttr(cmd)

	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	tunnelMu.Lock()
	tunnelCmd = cmd
	tunnelMu.Unlock()

	if err := cmd.Start(); err != nil {
		return err
	}

	// Read stderr for the public trycloudflare URL
	urlRegex := regexp.MustCompile(`https://[a-zA-Z0-9-]+\.trycloudflare\.com`)
	
	urlChan := make(chan string, 1)
	errChan := make(chan error, 1)

	// Goroutine to scan stderr logs
	go func() {
		scanner := bufio.NewScanner(stderrPipe)
		for scanner.Scan() {
			line := scanner.Text()
			if match := urlRegex.FindString(line); match != "" {
				select {
				case urlChan <- match:
				default:
				}
			}
		}
		if err := scanner.Err(); err != nil {
			select {
			case errChan <- err:
			default:
			}
		}
	}()

	// Wait for URL to appear or process to exit
	select {
	case <-ctx.Done():
		return nil
	case url := <-urlChan:
		tunnelMu.Lock()
		tunnelStatus = "CONNECTED"
		publicURL = url
		tunnelMu.Unlock()
		onStatus("CONNECTED", url, nil)
	case err := <-errChan:
		return fmt.Errorf("failed scanning cloudflared logs: %w", err)
	case <-time.After(20 * time.Second):
		return fmt.Errorf("timeout waiting for cloudflared public URL")
	}

	// Keep running until process exits
	err = cmd.Wait()
	
	// If context was cancelled, this is not an error
	if ctx.Err() != nil {
		return nil
	}

	if err != nil {
		return err
	}
	return io.EOF // Return EOF to trigger reconnect if it exited with code 0 unexpectedly
}

// StopTunnel stops any running tunnel.
func StopTunnel() {
	tunnelMu.Lock()
	defer tunnelMu.Unlock()
	if cancelFunc != nil {
		cancelFunc()
	}
	if tunnelCmd != nil && tunnelCmd.Process != nil {
		// On Windows, TaskKill or Job Objects should clean it, but let's signal it here
		_ = tunnelCmd.Process.Kill()
	}
}

// GetTunnelStatus returns current status and URL.
func GetTunnelStatus() (string, string) {
	tunnelMu.Lock()
	defer tunnelMu.Unlock()
	return tunnelStatus, publicURL
}

// SimulateDrop mocks connection failure.
func SimulateDrop(onStatus func(status, url string, err error)) {
	tunnelMu.Lock()
	defer tunnelMu.Unlock()
	if tunnelStatus == "CONNECTED" {
		if tunnelCmd != nil && tunnelCmd.Process != nil {
			_ = tunnelCmd.Process.Kill() // Kills the process, triggering the reconnect loop
		}
	}
}
