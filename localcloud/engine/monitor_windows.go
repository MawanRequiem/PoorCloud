//go:build windows

package engine

import (
	"fmt"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	psapi                = windows.NewLazySystemDLL("psapi.dll")
	getProcessMemoryInfo = psapi.NewProc("GetProcessMemoryInfo")
)

type processMemoryCounters struct {
	cb                         uint32
	pageFaultCount             uint32
	peakWorkingSetSize         uintptr
	workingSetSize             uintptr
	quotaPeakPagedPoolUsage    uintptr
	quotaPagedPoolUsage        uintptr
	quotaPeakNonPagedPoolUsage uintptr
	quotaNonPagedPoolUsage     uintptr
	pagefileUsage              uintptr
	peakPagefileUsage          uintptr
}

func getProcessStats(pid int) (int64, int64, error) {
	handle, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, uint32(pid))
	if err != nil {
		return 0, 0, err
	}
	defer windows.CloseHandle(handle)

	// Memory usage details via psapi.dll
	var mem processMemoryCounters
	mem.cb = uint32(unsafe.Sizeof(mem))

	r1, _, errCall := getProcessMemoryInfo.Call(
		uintptr(handle),
		uintptr(unsafe.Pointer(&mem)),
		uintptr(mem.cb),
	)
	if r1 == 0 {
		return 0, 0, fmt.Errorf("GetProcessMemoryInfo failed: %v", errCall)
	}

	ramMB := int64(mem.workingSetSize) / 1024 / 1024

	// CPU utilization times
	var creationTime, exitTime, kernelTime, userTime windows.Filetime
	err = windows.GetProcessTimes(handle, &creationTime, &exitTime, &kernelTime, &userTime)
	if err != nil {
		return 0, 0, err
	}

	kTime := (int64(kernelTime.HighDateTime) << 32) + int64(kernelTime.LowDateTime)
	uTime := (int64(userTime.HighDateTime) << 32) + int64(userTime.LowDateTime)
	// Convert 100-nanosecond intervals to milliseconds
	cpuTimeMs := (kTime + uTime) / 10000

	return ramMB, cpuTimeMs, nil
}
