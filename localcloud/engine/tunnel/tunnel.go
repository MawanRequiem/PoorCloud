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

type TunnelInstance struct {
	ProjectID string
	Status    string
	URL       string
	Ctx       context.Context
	Cancel    context.CancelFunc
	Cmd       *exec.Cmd
	mu        sync.Mutex
}

type TunnelManager struct {
	instances sync.Map
}

var manager = &TunnelManager{}

func findCloudflared() (string, error) {
	if path, err := exec.LookPath("cloudflared"); err == nil {
		return path, nil
	}

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

func StartEphemeralTunnel(ctx context.Context, localPort int, onStatus func(status, url string, err error)) error {
	return StartEphemeralTunnelForProject("", ctx, localPort, onStatus)
}

func StartEphemeralTunnelForProject(projectID string, parentCtx context.Context, localPort int, onStatus func(status, url string, err error)) error {
	if inst, exists := manager.instances.Load(projectID); exists {
		t := inst.(*TunnelInstance)
		if t.Status == "CONNECTED" || t.Status == "CONNECTING" {
			return fmt.Errorf("tunnel already running for project %s", projectID)
		}
	}

	runCtx, cancel := context.WithCancel(parentCtx)
	instance := &TunnelInstance{
		ProjectID: projectID,
		Status:    "CONNECTING",
		Ctx:       runCtx,
		Cancel:    cancel,
	}
	manager.instances.Store(projectID, instance)

	onStatus("CONNECTING", "", nil)

	go func() {
		defer func() {
			instance.mu.Lock()
			instance.Status = "DISCONNECTED"
			instance.URL = ""
			instance.mu.Unlock()
			onStatus("DISCONNECTED", "", nil)
		}()

		maxAttempts := 5
		for attempt := 0; attempt < maxAttempts; attempt++ {
			if runCtx.Err() != nil {
				return
			}

			if attempt > 0 {
				instance.mu.Lock()
				instance.Status = "RECONNECTING"
				instance.mu.Unlock()
				onStatus("RECONNECTING", "", fmt.Errorf("reconnecting attempt %d/%d", attempt, maxAttempts))

				select {
				case <-runCtx.Done():
					return
				case <-time.After(time.Duration(1<<attempt) * time.Second):
				}
			}

			err := startCloudflaredProcess(runCtx, instance, localPort, onStatus)
			if err == nil {
				return
			}
			fmt.Printf("[Tunnel] project=%s cloudflared exited: %v\n", projectID, err)
		}

		instance.mu.Lock()
		instance.Status = "FAILED"
		instance.mu.Unlock()
		onStatus("FAILED", "", fmt.Errorf("exhausted %d reconnection attempts", maxAttempts))
	}()

	return nil
}

func startCloudflaredProcess(ctx context.Context, instance *TunnelInstance, localPort int, onStatus func(status, url string, err error)) error {
	binPath, err := findCloudflared()
	if err != nil {
		return err
	}

	args := []string{"tunnel", "--url", fmt.Sprintf("http://localhost:%d", localPort)}
	cmd := exec.CommandContext(ctx, binPath, args...)
	core.SetPlatformSysProcAttr(cmd)

	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	instance.mu.Lock()
	instance.Cmd = cmd
	instance.mu.Unlock()

	if err := cmd.Start(); err != nil {
		return err
	}

	urlRegex := regexp.MustCompile(`https://[a-zA-Z0-9-]+\.trycloudflare\.com`)
	urlChan := make(chan string, 1)
	errChan := make(chan error, 1)

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

	select {
	case <-ctx.Done():
		return nil
	case url := <-urlChan:
		instance.mu.Lock()
		instance.Status = "CONNECTED"
		instance.URL = url
		instance.mu.Unlock()
		onStatus("CONNECTED", url, nil)
	case err := <-errChan:
		return fmt.Errorf("failed scanning cloudflared logs: %w", err)
	case <-time.After(20 * time.Second):
		return fmt.Errorf("timeout waiting for cloudflared public URL")
	}

	err = cmd.Wait()
	if ctx.Err() != nil {
		return nil
	}
	if err != nil {
		return err
	}
	return io.EOF
}

func StartTunnel(ctx context.Context, localPort int, onStatus func(status, url string, err error)) error {
	return StartEphemeralTunnelForProject("", ctx, localPort, onStatus)
}

func StopTunnel() {
	StopTunnelForProject("")
}

func StopTunnelForProject(projectID string) {
	if val, ok := manager.instances.Load(projectID); ok {
		instance := val.(*TunnelInstance)
		instance.Cancel()
		instance.mu.Lock()
		if instance.Cmd != nil && instance.Cmd.Process != nil {
			_ = instance.Cmd.Process.Kill()
		}
		instance.mu.Unlock()
		manager.instances.Delete(projectID)
	}
}

func GetTunnelStatus() (string, string) {
	return GetTunnelStatusForProject("")
}

func GetTunnelStatusForProject(projectID string) (string, string) {
	if val, ok := manager.instances.Load(projectID); ok {
		instance := val.(*TunnelInstance)
		instance.mu.Lock()
		defer instance.mu.Unlock()
		return instance.Status, instance.URL
	}
	return "DISCONNECTED", ""
}

func SimulateDrop(onStatus func(status, url string, err error)) {
	StopTunnel()
	onStatus("DISCONNECTED", "", nil)
}
