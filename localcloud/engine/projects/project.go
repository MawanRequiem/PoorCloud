package projects

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"localcloud/engine/process"
	"localcloud/engine/scanner"
	"localcloud/engine/tunnel"
)

type ProjectStatus string

const (
	StatusStopped   ProjectStatus = "stopped"
	StatusLaunching ProjectStatus = "launching"
	StatusRunning   ProjectStatus = "running"
	StatusError     ProjectStatus = "error"
)

type Project struct {
	ProjectID     string
	ScanResult    *scanner.ScanResult
	RunConfig     process.RunConfig
	Running       *process.RunningProcess
	TunnelStatus  string
	TunnelURL     string
	Status        ProjectStatus
	RamMB         int64
	CpuPercent    float64
	LastOOMAt     *time.Time
	Ctx           context.Context
	Cancel        context.CancelFunc
	CreatedAt     time.Time
	StartedAt     *time.Time
}

type ProjectState struct {
	ProjectID    string        `json:"projectID"`
	Name         string        `json:"name"`
	Version      string        `json:"version"`
	Framework    string        `json:"framework"`
	Port         int           `json:"port"`
	TunnelURL    string        `json:"tunnelURL"`
	TunnelStatus string        `json:"tunnelStatus"`
	Status       string        `json:"status"`
	RamMB        int64         `json:"ramMB"`
	CpuPercent   float64       `json:"cpuPercent"`
	ProjectPath  string        `json:"projectPath"`
	DevCommand   string        `json:"devCommand"`
	HasNode      bool          `json:"hasNode"`
	HasBun       bool          `json:"hasBun"`
}

type ProjectRegistry struct {
	mu       sync.RWMutex
	projects map[string]*Project
}

var registry = &ProjectRegistry{
	projects: make(map[string]*Project),
}

func RegisterProject(scan *scanner.ScanResult, cfg process.RunConfig) (string, error) {
	registry.mu.Lock()
	defer registry.mu.Unlock()

	id := uuid.New().String()
	ctx, cancel := context.WithCancel(context.Background())

	registry.projects[id] = &Project{
		ProjectID:  id,
		ScanResult: scan,
		RunConfig:  cfg,
		Status:     StatusStopped,
		Ctx:        ctx,
		Cancel:     cancel,
		CreatedAt:  time.Now(),
	}

	return id, nil
}

func UnregisterProject(projectID string) error {
	registry.mu.Lock()
	defer registry.mu.Unlock()

	project, ok := registry.projects[projectID]
	if !ok {
		return fmt.Errorf("project %s not found", projectID)
	}

	project.Cancel()
	delete(registry.projects, projectID)
	return nil
}

func GetProject(projectID string) (*Project, error) {
	registry.mu.RLock()
	defer registry.mu.RUnlock()

	project, ok := registry.projects[projectID]
	if !ok {
		return nil, fmt.Errorf("project %s not found", projectID)
	}
	return project, nil
}

func ListProjects() []ProjectState {
	registry.mu.RLock()
	defer registry.mu.RUnlock()

	result := make([]ProjectState, 0, len(registry.projects))
	for _, p := range registry.projects {
		state := ProjectState{
			ProjectID:    p.ProjectID,
			Name:         p.ScanResult.Name,
			Version:      p.ScanResult.Version,
			Framework:    p.ScanResult.Framework,
			Port:         p.RunConfig.Port,
			TunnelURL:    p.TunnelURL,
			TunnelStatus: p.TunnelStatus,
			Status:       string(p.Status),
			RamMB:        p.RamMB,
			CpuPercent:   p.CpuPercent,
			ProjectPath:  p.ScanResult.ProjectPath,
			DevCommand:   p.ScanResult.DevCommand,
			HasNode:      p.ScanResult.HasNode,
			HasBun:       p.ScanResult.HasBun,
		}
		result = append(result, state)
	}
	return result
}

func UpdateProjectStats(projectID string, ramMB int64, cpuPercent float64) {
	registry.mu.Lock()
	defer registry.mu.Unlock()

	project, ok := registry.projects[projectID]
	if !ok {
		return
	}
	project.RamMB = ramMB
	project.CpuPercent = cpuPercent
}

func UpdateProjectTunnel(projectID, status, url string) {
	registry.mu.Lock()
	defer registry.mu.Unlock()

	project, ok := registry.projects[projectID]
	if !ok {
		return
	}
	project.TunnelStatus = status
	project.TunnelURL = url

	switch status {
	case "CONNECTED":
		project.Status = StatusRunning
	case "FAILED", "DISCONNECTED":
		if project.Status == StatusRunning {
			project.Status = StatusError
		}
	}
}

func MarkProjectOOM(projectID string) {
	registry.mu.Lock()
	defer registry.mu.Unlock()

	project, ok := registry.projects[projectID]
	if !ok {
		return
	}
	project.Status = StatusError
	now := time.Now()
	project.LastOOMAt = &now
}

func SetProjectRunning(projectID string, rp *process.RunningProcess) {
	registry.mu.Lock()
	defer registry.mu.Unlock()

	project, ok := registry.projects[projectID]
	if !ok {
		return
	}
	project.Running = rp
	project.Status = StatusRunning
	now := time.Now()
	project.StartedAt = &now
}

func StartProject(projectID string, onLog func(projectID string, lines []string), onResource func(projectID string, ramMB int64, cpuPercent float64, timestamp int64), onOOM func(projectID string, memoryLimit int64), onTunnelStatus func(projectID, status, url string, err error)) error {
	project, err := GetProject(projectID)
	if err != nil {
		return err
	}

	SetProjectRunning(projectID, nil)

	rp, err := process.RunDevServer(project.Ctx, project.RunConfig, func(event string, data interface{}) {
		switch event {
		case "process-log":
			if logLines, ok := data.([]string); ok {
				onLog(projectID, logLines)
			}
		case "process-oom":
			if d, ok := data.(map[string]interface{}); ok {
				if limit, ok := d["memoryLimit"].(int64); ok {
					MarkProjectOOM(projectID)
					onOOM(projectID, limit)
				}
			}
		}
	})
	if err != nil {
		registry.mu.Lock()
		if p, ok := registry.projects[projectID]; ok {
			p.Status = StatusError
		}
		registry.mu.Unlock()
		return err
	}

	SetProjectRunning(projectID, rp)

	go process.StartLogPipeForProject(projectID, project.Ctx, rp.LogChan, func(eventName string, data interface{}) {
		if d, ok := data.(map[string]interface{}); ok {
			if lines, ok := d["lines"].([]string); ok {
				onLog(projectID, lines)
			}
		}
	})

	go process.StartResourceMonitorForProject(projectID, project.Ctx, rp.PID, project.RunConfig.MemoryMB, func(eventName string, data interface{}) {
		if d, ok := data.(map[string]interface{}); ok {
			if ramMB, ok := d["ramMB"].(int64); ok {
				if cpuPercent, ok := d["cpuPercent"].(float64); ok {
					if timestamp, ok := d["timestamp"].(int64); ok {
						UpdateProjectStats(projectID, ramMB, cpuPercent)
						onResource(projectID, ramMB, cpuPercent, timestamp)
					}
				}
			}
		}
	})

	go func() {
		if err := tunnel.StartEphemeralTunnelForProject(projectID, project.Ctx, project.RunConfig.Port, func(status, url string, err error) {
			UpdateProjectTunnel(projectID, status, url)
			onTunnelStatus(projectID, status, url, err)
		}); err != nil {
			onTunnelStatus(projectID, "FAILED", "", err)
		}
	}()

	return nil
}

func StopProject(projectID string) error {
	project, err := GetProject(projectID)
	if err != nil {
		return err
	}

	tunnel.StopTunnelForProject(projectID)
	process.StopMonitorForProject(projectID)

	if project.Running != nil {
		process.StopDevServer(project.Running)
	}

	project.Cancel()

	registry.mu.Lock()
	if p, ok := registry.projects[projectID]; ok {
		p.Status = StatusStopped
		p.TunnelStatus = "DISCONNECTED"
		p.TunnelURL = ""
		now := time.Now()
		p.StartedAt = &now
	}
	registry.mu.Unlock()

	return nil
}

func RemoveProject(projectID string) error {
	_ = StopProject(projectID)
	return UnregisterProject(projectID)
}
