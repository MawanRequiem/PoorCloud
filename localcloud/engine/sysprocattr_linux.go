//go:build linux

package engine

import (
	"syscall"
)

// newSysProcAttr returns SysProcAttr with Setpgid for anti-zombie on Linux.
func newSysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{Setpgid: true}
}
