package main

import (
	"context"

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

// ScanProject delegates to the engine scanner for framework/port/runtime detection.
// ponytail: delegates to engine.ScanProject, returns typed result.
func (a *App) ScanProject(projectPath string) (*engine.ScanResult, error) {
	return engine.ScanProject(projectPath)
}

// LimitResources bounds CPU and memory limits for a running process.
func (a *App) LimitResources(pid int, memoryMb int64, cpuCores float64) error {
	return engine.LimitResources(pid, memoryMb, cpuCores)
}
