package core

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ponytail: pure validation functions, zero deps, no struct.

// ValidatePort checks that port is between 1025 and 65535.
func ValidatePort(port int) error {
	if port <= 1024 || port > 65535 {
		return fmt.Errorf("port must be between 1025 and 65535, got %d", port)
	}
	return nil
}

// ValidatePath checks the path exists, is a directory, and has no traversal.
func ValidatePath(path string) error {
	cleaned := filepath.Clean(path)
	if strings.Contains(cleaned, "..") {
		return fmt.Errorf("path traversal not allowed: %s", path)
	}
	info, err := os.Stat(cleaned)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("path does not exist: %s", cleaned)
		}
		return fmt.Errorf("cannot access path: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("path is not a directory: %s", cleaned)
	}
	return nil
}

// ValidateScriptName checks that name is a key in the scripts map.
func ValidateScriptName(name string, scripts map[string]string) error {
	if _, ok := scripts[name]; !ok {
		return fmt.Errorf("script '%s' not found in package.json", name)
	}
	return nil
}
