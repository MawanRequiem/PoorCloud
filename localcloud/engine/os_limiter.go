package engine

import (
	"fmt"
	"runtime"
	"sync"
)

// ponytail: dispatcher only. Platform-specific files do the real work.

var (
	linuxLimiterType string
	linuxLimiterOnce sync.Once
)

// LimitResources restricts CPU and RAM usage of the process with the given PID.
func LimitResources(pid int, memoryMb int64, cpuCores float64) error {
	switch runtime.GOOS {
	case "windows":
		return applyWindowsLimits(pid, memoryMb, cpuCores)
	case "linux":
		return applyLinuxLimits(pid, memoryMb, cpuCores)
	default:
		return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}
}

// DetectLinuxLimiter returns the detected Linux limiter tier.
func DetectLinuxLimiter() string {
	if runtime.GOOS != "linux" {
		return ""
	}
	linuxLimiterOnce.Do(func() {
		linuxLimiterType = detectLinuxLimiter()
	})
	return linuxLimiterType
}
