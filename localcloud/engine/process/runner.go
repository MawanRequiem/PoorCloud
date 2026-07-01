package process

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
	"localcloud/engine/core"
)

// ponytail: one file, one RunConfig struct, one RunDevServer function. The glue between scanner, limiter, and tunnel.

// RunConfig specifies how to launch the dev server.
type RunConfig struct {
	ProjectPath string  `json:"projectPath"`
	Runtime     string  `json:"runtime"`
	ScriptName  string  `json:"scriptName"`
	Port        int     `json:"port"`
	MemoryMB    int64   `json:"memoryMB"`
	CPUCores    float64 `json:"cpuCores"`
}

// RunningProcess tracks a launched dev server.
type RunningProcess struct {
	Cmd       *exec.Cmd
	PID       int
	PGID      int
	LogChan   chan string
	Cancel    context.CancelFunc
	StartedAt time.Time
	mu        sync.Mutex
	done      chan struct{}
}

const logChanBuffer = 512

// RunDevServer launches the dev server, pipes logs, applies resource limits, and monitors exit.
func RunDevServer(ctx context.Context, cfg RunConfig, onEvent func(event string, data interface{})) (*RunningProcess, error) {
	if err := core.ValidatePort(cfg.Port); err != nil {
		return nil, err
	}
	if err := core.ValidatePath(cfg.ProjectPath); err != nil {
		return nil, err
	}

	runtimePath, err := exec.LookPath(cfg.Runtime)
	if err != nil {
		return nil, fmt.Errorf("runtime '%s' not found in PATH: %w", cfg.Runtime, err)
	}

	runCtx, cancel := context.WithCancel(ctx)

	cmd := exec.CommandContext(runCtx, runtimePath, "run", cfg.ScriptName)
	cmd.Dir = cfg.ProjectPath
	cmd.Env = append(os.Environ(), fmt.Sprintf("PORT=%d", cfg.Port))

	// Platform-specific process attributes for anti-zombie
	cmd.SysProcAttr = newSysProcAttr()

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		cancel()
		return nil, fmt.Errorf("stdout pipe: %w", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		cancel()
		return nil, fmt.Errorf("stderr pipe: %w", err)
	}

	merged := io.MultiReader(stdout, stderr)
	logChan := make(chan string, logChanBuffer)

	if err := cmd.Start(); err != nil {
		cancel()
		return nil, fmt.Errorf("start dev server: %w", err)
	}

	rp := &RunningProcess{
		Cmd:       cmd,
		PID:       cmd.Process.Pid,
		LogChan:   logChan,
		Cancel:    cancel,
		StartedAt: time.Now(),
		done:      make(chan struct{}),
	}

	// Track in process guard
	TrackProcess(rp.PID, cancel)

	onEvent("process-started", map[string]interface{}{
		"pid":  rp.PID,
		"port": cfg.Port,
	})

	// Log pipe goroutine
	go func() {
		scanner := bufio.NewScanner(merged)
		scanner.Buffer(make([]byte, 64*1024), 1024*1024)
		for scanner.Scan() {
			line := scanner.Text()
			select {
			case logChan <- line:
			default:
				// Channel full, drop oldest line (pop one, push new)
				select {
				case <-logChan:
				default:
				}
				logChan <- line
			}
		}
		close(logChan)
	}()

	// Monitor exit goroutine
	go func() {
		defer close(rp.done)
		defer UntrackProcess(rp.PID)

		err := cmd.Wait()
		exitCode := 0
		if err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				exitCode = exitErr.ExitCode()
			}
		}

		switch {
		case exitCode == 0:
			onEvent("process-exit", map[string]interface{}{
				"code":   0,
				"reason": "clean exit",
			})
		case exitCode == 137 || exitCode == 139:
			msg := "Server Lokal Terhenti: Penggunaan memori melewati batas yang Anda tentukan."
			onEvent("process-oom", map[string]interface{}{
				"memoryLimit": cfg.MemoryMB,
				"exitCode":    exitCode,
				"message":     msg,
			})
		default:
			reason := fmt.Sprintf("exit code %d", exitCode)
			if err != nil {
				reason = err.Error()
			}
			onEvent("process-exit", map[string]interface{}{
				"code":   exitCode,
				"reason": reason,
			})
		}
	}()

	// Apply resource limits after start
	go func() {
		// Brief pause to let the process fully initialize
		time.Sleep(100 * time.Millisecond)
		if err := LimitResources(rp.PID, cfg.MemoryMB, cfg.CPUCores); err != nil {
			onEvent("process-warn", map[string]interface{}{
				"message": fmt.Sprintf("failed to apply resource limits: %v", err),
			})
		}
	}()

	return rp, nil
}

// StopDevServer terminates the running dev server and all its subprocesses.
func StopDevServer(rp *RunningProcess) {
	if rp == nil {
		return
	}
	rp.Cancel()

	select {
	case <-rp.done:
	case <-time.After(5 * time.Second):
		if rp.Cmd != nil && rp.Cmd.Process != nil {
			rp.Cmd.Process.Kill()
		}
	}
}

// ReadLogs drains available log lines from the channel without blocking.
func ReadLogs(rp *RunningProcess) []string {
	var lines []string
	for {
		select {
		case line, ok := <-rp.LogChan:
			if !ok {
				return lines
			}
			lines = append(lines, line)
		default:
			return lines
		}
	}
}

// StartLogBatcher reads from logChan and emits batched events every 100ms.
func StartLogBatcher(ctx context.Context, logChan <-chan string, emitFn func(eventName string, data interface{})) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	var batch []string
	for {
		select {
		case <-ctx.Done():
			if len(batch) > 0 {
				emitFn("process-log", batch)
			}
			return
		case line, ok := <-logChan:
			if !ok {
				if len(batch) > 0 {
					emitFn("process-log", batch)
				}
				return
			}
			batch = append(batch, line)
		case <-ticker.C:
			if len(batch) == 0 {
				continue
			}
			emitFn("process-log", batch)
			batch = batch[:0]
		}
	}
}

// DetectLogColors returns simple semantic colors for log lines.
func DetectLogColors(line string) string {
	lower := strings.ToLower(line)
	switch {
	case strings.Contains(lower, "error") || strings.Contains(lower, "trace"):
		return "text-red-400 font-semibold"
	case strings.Contains(lower, "warn"):
		return "text-amber-400"
	case strings.Contains(lower, "200") || strings.Contains(lower, "201") || strings.Contains(lower, "304"):
		return "text-green-400"
	case strings.Contains(lower, "404") || strings.Contains(lower, "500") || strings.Contains(lower, "503"):
		return "text-red-400"
	default:
		return "text-gray-300"
	}
}
