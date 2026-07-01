//go:build !linux

package engine

// applyLinuxLimits is a stub for non-Linux builds.
func applyLinuxLimits(pid int, memMB int64, cpuCores float64) error {
	return nil
}

// detectLinuxLimiter is a stub for non-Linux builds.
func detectLinuxLimiter() string {
	return ""
}
