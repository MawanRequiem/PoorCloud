//go:build windows

package engine

import (
	"fmt"
	"sync"
	"syscall"
	"unsafe"
)

// ponytail: direct kernel32 syscalls for Windows Job Objects. No external deps.

var (
	kernel32DLL                   = syscall.NewLazyDLL("kernel32.dll")
	procCreateJobObject           = kernel32DLL.NewProc("CreateJobObjectW")
	procOpenProcess               = kernel32DLL.NewProc("OpenProcess")
	procAssignProcessToJobObject  = kernel32DLL.NewProc("AssignProcessToJobObject")
	procSetInformationJobObject   = kernel32DLL.NewProc("SetInformationJobObject")
	procCloseHandle               = kernel32DLL.NewProc("CloseHandle")
	procTerminateJobObject        = kernel32DLL.NewProc("TerminateJobObject")
)

const (
	jobObjectExtendedLimitInformation = 9
	jobObjectCpuRateControlInformation = 15

	jobObjectLimitProcessMemory = 0x00000100

	cpuRateControlEnable    = 0x00000001
	cpuRateControlHardCap   = 0x00000004

	processSetQuota    = 0x0100
	processTerminate   = 0x0001
)

type jobObjectExtendedLimitInfo struct {
	BasicLimitInformation struct {
		_             [16]byte // padding / unused fields
		LimitFlags    uint32
		_             [8]byte
		_             uint64
		_             uint64
		ProcessMemoryLimit uintptr
		_             [24]byte
	}
}

type jobObjectCpuRateControlInfo struct {
	ControlFlags uint32
	CpuRate      uint32
}

var activeJobs sync.Map

// applyWindowsLimits creates a Job Object and assigns the process to it.
func applyWindowsLimits(pid int, memMB int64, cpuCores float64) error {
	jobHandle, _, err := procCreateJobObject.Call(0, 0)
	if jobHandle == 0 {
		return fmt.Errorf("CreateJobObject failed: %w", err)
	}

	processHandle, _, err := procOpenProcess.Call(
		uintptr(processSetQuota|processTerminate),
		0,
		uintptr(pid),
	)
	if processHandle == 0 {
		procCloseHandle.Call(jobHandle)
		return fmt.Errorf("OpenProcess failed for PID %d: %w", pid, err)
	}

	ret, _, err := procAssignProcessToJobObject.Call(jobHandle, processHandle)
	if ret == 0 {
		procCloseHandle.Call(processHandle)
		procCloseHandle.Call(jobHandle)
		return fmt.Errorf("AssignProcessToJobObject failed: %w", err)
	}

	// Memory limit
	if memMB > 0 {
		info := &jobObjectExtendedLimitInfo{}
		info.BasicLimitInformation.LimitFlags = jobObjectLimitProcessMemory
		info.BasicLimitInformation.ProcessMemoryLimit = uintptr(memMB * 1024 * 1024)

		ret, _, err = procSetInformationJobObject.Call(
			jobHandle,
			jobObjectExtendedLimitInformation,
			uintptr(unsafe.Pointer(info)),
			uintptr(unsafe.Sizeof(*info)),
		)
		if ret == 0 {
			procCloseHandle.Call(processHandle)
			procCloseHandle.Call(jobHandle)
			return fmt.Errorf("SetInformationJobObject memory limit failed: %w", err)
		}
	}

	// CPU limit (as a percentage of total)
	if cpuCores > 0 {
		cpuPercent := uint32(cpuCores * 100.0)
		if cpuPercent < 1 {
			cpuPercent = 1
		}
		if cpuPercent > 10000 {
			cpuPercent = 10000
		}

		cpuInfo := &jobObjectCpuRateControlInfo{}
		cpuInfo.ControlFlags = cpuRateControlEnable | cpuRateControlHardCap
		cpuInfo.CpuRate = cpuPercent * 100 // in hundredths of a percent

		ret, _, err = procSetInformationJobObject.Call(
			jobHandle,
			jobObjectCpuRateControlInformation,
			uintptr(unsafe.Pointer(cpuInfo)),
			uintptr(unsafe.Sizeof(*cpuInfo)),
		)
		if ret == 0 {
			// Non-fatal: CPU limit is best-effort on some Windows versions
			fmt.Printf("[JobObject] CPU rate control not supported on this system\n")
		}
	}

	procCloseHandle.Call(processHandle)
	activeJobs.Store(pid, jobHandle)

	fmt.Printf("[OS Limiter] Windows: Restricted PID %d to %d MB RAM, %0.1f CPU via Job Objects\n", pid, memMB, cpuCores)
	return nil
}

// cleanupWindowsJob terminates all processes in the Job Object for the given PID.
func cleanupWindowsJob(pid int) {
	if h, ok := activeJobs.Load(pid); ok {
		handle := h.(uintptr)
		procTerminateJobObject.Call(handle, 1)
		procCloseHandle.Call(handle)
		activeJobs.Delete(pid)
	}
}
