//go:build linux

package engine

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

func getProcessStats(pid int) (int64, int64, error) {
	// Memory usage from statm resident pages
	statmBytes, err := os.ReadFile(fmt.Sprintf("/proc/%d/statm", pid))
	if err != nil {
		return 0, 0, err
	}
	statmFields := strings.Fields(string(statmBytes))
	if len(statmFields) < 2 {
		return 0, 0, fmt.Errorf("invalid statm format")
	}
	residentPages, err := strconv.ParseInt(statmFields[1], 10, 64)
	if err != nil {
		return 0, 0, err
	}
	pageSize := int64(os.Getpagesize())
	ramMB := (residentPages * pageSize) / 1024 / 1024

	// CPU times (utime + stime)
	statBytes, err := os.ReadFile(fmt.Sprintf("/proc/%d/stat", pid))
	if err != nil {
		return 0, 0, err
	}
	statFields := strings.Fields(string(statBytes))
	if len(statFields) < 15 {
		return 0, 0, fmt.Errorf("invalid stat format")
	}
	utime, err := strconv.ParseInt(statFields[13], 10, 64)
	if err != nil {
		return 0, 0, err
	}
	stime, err := strconv.ParseInt(statFields[14], 10, 64)
	if err != nil {
		return 0, 0, err
	}

	// utime + stime in clock ticks. Multiply by 10 to get approximate milliseconds
	cpuTimeMs := (utime + stime) * 10

	return ramMB, cpuTimeMs, nil
}
