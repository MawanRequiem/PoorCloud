package main

import (
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
	"localcloud/engine/core"
	"localcloud/engine/process"
	"localcloud/engine/projects"
	"localcloud/engine/scanner"
)

func (a *App) ListProjects() []projects.ProjectState {
	return projects.ListProjects()
}

func (a *App) StartProject(projectID string) error {
	return projects.StartProject(projectID,
		func(projectID string, lines []string) {
			wailsRuntime.EventsEmit(a.ctx, "process-log", map[string]interface{}{
				"projectID": projectID,
				"lines":     lines,
			})
		},
		func(projectID string, ramMB int64, cpuPercent float64, timestamp int64) {
			wailsRuntime.EventsEmit(a.ctx, "resource-usage", map[string]interface{}{
				"projectID":  projectID,
				"ramMB":      ramMB,
				"cpuPercent": cpuPercent,
				"timestamp":  timestamp,
			})
		},
		func(projectID string, memoryLimit int64) {
			wailsRuntime.EventsEmit(a.ctx, "process-oom", map[string]interface{}{
				"projectID":   projectID,
				"memoryLimit": memoryLimit,
			})
		},
		func(projectID, status, url string, err error) {
			errMsg := ""
			if err != nil {
				errMsg = err.Error()
			}
			wailsRuntime.EventsEmit(a.ctx, "tunnel-status", map[string]interface{}{
				"projectID": projectID,
				"status":    status,
				"url":       url,
				"error":     errMsg,
			})
		},
	)
}

func (a *App) StopProject(projectID string) error {
	return projects.StopProject(projectID)
}

func (a *App) RemoveProject(projectID string) error {
	return projects.RemoveProject(projectID)
}

func (a *App) RegisterAndStartProject(scanResult *scanner.ScanResult, cfg process.RunConfig) (string, error) {
	projectID, err := projects.RegisterProject(scanResult, cfg)
	if err != nil {
		return "", err
	}

	go func() {
		_ = a.StartProject(projectID)
	}()

	return projectID, nil
}

func (a *App) SaveDefaultSettings(cfg core.AppConfig) error {
	return core.SaveConfig(&cfg)
}
