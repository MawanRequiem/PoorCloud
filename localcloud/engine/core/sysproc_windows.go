//go:build windows

package core

import "os/exec"

func SetPlatformSysProcAttr(cmd *exec.Cmd) {
	// Job Objects handle process grouping on Windows, so we do nothing here.
}
