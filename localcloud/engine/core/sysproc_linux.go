//go:build linux

package core

import (
	"os/exec"
	"syscall"
)

func SetPlatformSysProcAttr(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
}
