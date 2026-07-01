//go:build !linux

package process

import (
	"syscall"
)

// newSysProcAttr returns nil for non-Linux platforms.
func newSysProcAttr() *syscall.SysProcAttr {
	return nil
}
