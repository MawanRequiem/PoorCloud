package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"localcloud/engine"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ScanProject sniffs runtime binaries and parses package.json from the path.
// ponytail: YAGNI - directly uses standard libraries and simple exec.Command runs to scan target environment.
func (a *App) ScanProject(projectPath string) (map[string]interface{}, error) {
	pkgPath := filepath.Join(projectPath, "package.json")
	data, err := os.ReadFile(pkgPath)
	if err != nil {
		return nil, fmt.Errorf("package.json not found")
	}

	var pkg map[string]interface{}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return nil, fmt.Errorf("invalid package.json format")
	}

	// Sniff runtimes
	hasNode := exec.Command("node", "-v").Run() == nil
	hasBun := exec.Command("bun", "-v").Run() == nil

	return map[string]interface{}{
		"name":    pkg["name"],
		"scripts": pkg["scripts"],
		"hasNode": hasNode,
		"hasBun":  hasBun,
	}, nil
}

// LimitResources bounds CPU and memory limits.
func (a *App) LimitResources(pid int, memoryMb int64, cpuCores float64) error {
	return engine.LimitResources(pid, memoryMb, cpuCores)
}
