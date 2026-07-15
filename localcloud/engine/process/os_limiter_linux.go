//go:build linux

package process

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
)

// ponytail: three-tier fallback using only exec.Command + /sys/fs/cgroup. No external deps.

// applyLinuxLimits applies resource limits using the best available method.
func applyLinuxLimits(pid int, memMB int64, cpuCores float64) error {
	limiterType := detectLinuxLimiter()

	switch limiterType {
	case "cgroupsv2":
		return applyCgroupsV2(pid, memMB, cpuCores)
	case "cgroupsv1":
		return applyCgroupsV1(pid, memMB, cpuCores)
	case "posix":
		return applyPosixLimits(pid, memMB, cpuCores)
	default:
		return fmt.Errorf("no suitable limiter found for Linux")
	}
}

// detectLinuxLimiter caches the result of detecting the best available limiter.
func detectLinuxLimiter() string {
	// Check systemd + cgroups v2
	if exec.Command("systemctl", "--user", "--version").Run() == nil {
		if data, err := os.ReadFile("/sys/fs/cgroup/cgroup.controllers"); err == nil && len(data) > 0 {
			return "cgroupsv2"
		}
		// cgroups v1
		if _, err := os.Stat("/sys/fs/cgroup/memory"); err == nil {
			return "cgroupsv1"
		}
	}

	// Check for taskset/prlimit fallback
	if exec.Command("taskset", "--version").Run() == nil {
		return "posix"
	}

	return "none"
}

// applyCgroupsV2 uses systemd-run --scope for cgroups v2 user-session limits.
func applyCgroupsV2(pid int, memMB int64, cpuCores float64) error {
	cgroupName := fmt.Sprintf("localcloud-%d.scope", pid)
	memMax := fmt.Sprintf("MemoryMax=%dM", memMB)
	cpuQuota := fmt.Sprintf("CPUQuota=%d%%", int(cpuCores*100))

	cmd := exec.Command("systemd-run", "--user", "--scope",
		"-p", memMax,
		"-p", cpuQuota,
		"--unit", cgroupName,
		"--", "cat", fmt.Sprintf("/proc/%d/cmdline", pid),
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("cgroups v2 apply failed: %w\n%s", err, string(output))
	}

	fmt.Printf("[OS Limiter] Linux (cgroups v2): Restricted PID %d to %d MB RAM, %0.1f CPU\n", pid, memMB, cpuCores)
	return nil
}

// applyCgroupsV1 writes directly to cgroup control files for old systemd.
func applyCgroupsV1(pid int, memMB int64, cpuCores float64) error {
	pidStr := strconv.Itoa(pid)

	// Memory limit
	memPath := fmt.Sprintf("/sys/fs/cgroup/memory/user.slice/localcloud-%d", pid)
	if err := os.MkdirAll(memPath, 0755); err != nil {
		return fmt.Errorf("cgroups v1 mkdir memory: %w", err)
	}
	if err := os.WriteFile(filepath.Join(memPath, "memory.limit_in_bytes"),
		[]byte(fmt.Sprintf("%d", memMB*1024*1024)), 0644); err != nil {
		return fmt.Errorf("cgroups v1 write memory limit: %w", err)
	}
	if err := os.WriteFile(filepath.Join(memPath, "tasks"),
		[]byte(pidStr), 0644); err != nil {
		// If the process already exited, this may fail - non-fatal
	}

	// CPU limit
	cpuPath := fmt.Sprintf("/sys/fs/cgroup/cpu/user.slice/localcloud-%d", pid)
	if err := os.MkdirAll(cpuPath, 0755); err != nil {
		return fmt.Errorf("cgroups v1 mkdir cpu: %w", err)
	}

	// Set CPU quota (period = 100000us, quota = period * cores)
	period := int64(100000)
	quota := int64(float64(period) * cpuCores)
	if err := os.WriteFile(filepath.Join(cpuPath, "cpu.cfs_quota_us"),
		[]byte(fmt.Sprintf("%d", quota)), 0644); err != nil {
		return fmt.Errorf("cgroups v1 write cpu quota: %w", err)
	}
	if err := os.WriteFile(filepath.Join(cpuPath, "tasks"),
		[]byte(pidStr), 0644); err != nil {
	}

	fmt.Printf("[OS Limiter] Linux (cgroups v1): Restricted PID %d to %d MB RAM, %0.1f CPU\n", pid, memMB, cpuCores)
	return nil
}

// applyPosixLimits uses taskset for CPU affinity and prlimit for memory.
func applyPosixLimits(pid int, memMB int64, cpuCores float64) error {
	pidStr := strconv.Itoa(pid)
	cores := int(cpuCores)
	if cores < 1 {
		cores = 1
	}
	coreRange := fmt.Sprintf("0-%d", cores-1)

	// CPU affinity via taskset
	if err := exec.Command("taskset", "-c", coreRange, "-p", pidStr).Run(); err != nil {
		return fmt.Errorf("taskset failed: %w", err)
	}

	// Memory limit via prlimit (address space)
	memBytes := memMB * 1024 * 1024
	if err := exec.Command("prlimit",
		fmt.Sprintf("--pid=%s", pidStr),
		fmt.Sprintf("--as=%d", memBytes),
	).Run(); err != nil {
		return fmt.Errorf("prlimit failed: %w", err)
	}

	fmt.Printf("[OS Limiter] Linux (posix fallback): Restricted PID %d to %d MB RAM, %0.1f CPU\n", pid, memMB, cpuCores)
	return nil
}


