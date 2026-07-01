package main

import (
	"context"
	"localcloud/engine/scanner"
	"localcloud/engine/process"
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

// ScanProject delegates to the engine scanner for framework/port/runtime detection.
// ponytail: delegates to scanner.ScanProject, returns typed result.
func (a *App) ScanProject(projectPath string) (*scanner.ScanResult, error) {
	return scanner.ScanProject(projectPath)
}

// LimitResources bounds CPU and memory limits for a running process.
func (a *App) LimitResources(pid int, memoryMb int64, cpuCores float64) error {
	return process.LimitResources(pid, memoryMb, cpuCores)
}
