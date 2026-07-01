//go:build !linux

package engine

import (
	"syscall"
)

// newSysProcAttr returns nil for non-Linux platforms.
func newSysProcAttr() *syscall.SysProcAttr {
	return nil
}
