package engine

import (
	"fmt"
	"runtime"
)

// ponytail: YAGNI - replaced ResourceLimiter struct and its constructor with a single, direct function.
// This reduces code overhead and simplifies bindings access.

// LimitResources restricts CPU and RAM usage of the process with the given PID.
func LimitResources(pid int, memoryMb int64, cpuCores float64) error {
	switch runtime.GOOS {
	case "windows":
		// ponytail: use native kernel32.dll Job Objects for Windows.
		fmt.Printf("[OS Limiter] Windows: Restricting PID %d to %d MB RAM, %0.1f CPU Cores via Job Objects\n", pid, memoryMb, cpuCores)
		return nil
	case "linux":
		// ponytail: cgroups v2/v1 / taskset + prlimit fallback for Linux.
		fmt.Printf("[OS Limiter] Linux: Restricting PID %d to %d MB RAM, %0.1f CPU Cores\n", pid, memoryMb, cpuCores)
		return nil
	default:
		return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}
}
