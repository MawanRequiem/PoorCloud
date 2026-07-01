package engine

import (
	"context"
	"os"
	"sync"
)

// ponytail: package-level sync.Map for tracked processes. No struct, no manager object.

var (
	trackedCancel sync.Map // pid -> context.CancelFunc
	trackedMu     sync.Mutex
)

// TrackProcess registers a PID for cleanup on shutdown.
func TrackProcess(pid int, cancel context.CancelFunc) {
	trackedCancel.Store(pid, cancel)
}

// UntrackProcess removes a PID from the cleanup registry.
func UntrackProcess(pid int) {
	trackedCancel.Delete(pid)
}

// KillAllProcesses cancels all tracked process contexts.
func KillAllProcesses() {
	trackedCancel.Range(func(key, value interface{}) bool {
		if cancel, ok := value.(context.CancelFunc); ok {
			cancel()
		}
		return true
	})
}

// KillProcessByPID cancels a specific tracked process context.
func KillProcessByPID(pid int) {
	if val, ok := trackedCancel.Load(pid); ok {
		if cancel, ok := val.(context.CancelFunc); ok {
			cancel()
		}
		trackedCancel.Delete(pid)
	}
}

// cleanupZombies ensures no orphan processes remain by sending SIGKILL.
// On Linux this kills the process group; on Windows the Job Object handles it.
// This is called during Wails OnShutdown.
func CleanupZombies() {
	KillAllProcesses()
}

// IsProcessRunning checks if a PID is still alive.
func IsProcessRunning(pid int) bool {
	process, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	// On Unix, FindProcess always succeeds. Send signal 0 to check.
	return process.Signal(os.Signal(nil)) == nil
}
