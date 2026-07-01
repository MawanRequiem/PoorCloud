//go:build windows

package engine

import "os/exec"

func setPlatformSysProcAttr(cmd *exec.Cmd) {
	// Job Objects handle process grouping on Windows, so we do nothing here.
}
