//go:build !windows

package engine

// applyWindowsLimits is a stub for non-Windows builds.
func applyWindowsLimits(pid int, memMB int64, cpuCores float64) error {
	return nil
}
