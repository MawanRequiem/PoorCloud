package engine

import (
	"os"
	"runtime"
	"strconv"
	"strings"
)

// ponytail: avoids importing gopsutil for just two numbers. Stdlib + /proc on Linux.

// SystemInfo holds basic hardware info for the UI sliders.
type SystemInfo struct {
	TotalRAMMB int64  `json:"totalRamMB"`
	CPUCores   int    `json:"cpuCores"`
	OS         string `json:"os"`
	Arch       string `json:"arch"`
}

var cachedInfo *SystemInfo

// GetSystemInfo returns cached system information.
func GetSystemInfo() SystemInfo {
	if cachedInfo != nil {
		return *cachedInfo
	}

	info := SystemInfo{
		CPUCores: runtime.NumCPU(),
		OS:       runtime.GOOS,
		Arch:     runtime.GOARCH,
		TotalRAMMB: detectTotalRAM(),
	}

	cachedInfo = &info
	return info
}

func detectTotalRAM() int64 {
	switch runtime.GOOS {
	case "linux":
		return readMemTotalLinux()
	case "windows":
		return readTotalMemWindows()
	default:
		return 4096 // safe fallback
	}
}

// readMemTotalLinux parses /proc/meminfo for MemTotal.
func readMemTotalLinux() int64 {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return 4096
	}
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, "MemTotal:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				kb, err := strconv.ParseInt(fields[1], 10, 64)
				if err == nil {
					return kb / 1024
				}
			}
		}
	}
	return 4096
}

// readTotalMemWindows uses the Win32 GlobalMemoryStatusEx via x/sys/windows.
func readTotalMemWindows() int64 {
	// Use x/sys/windows GlobalMemoryStatusEx
	return callGlobalMemoryStatusEx()
}
