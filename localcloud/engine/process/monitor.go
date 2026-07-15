package process

import (
	"context"
	"sync"
	"time"
)

type MonitorManager struct {
	monitors sync.Map
}

var monitorManager = &MonitorManager{}

func StartResourceMonitor(ctx context.Context, pid int, limitMB int64, emitFn func(string, interface{})) {
	StartResourceMonitorForProject("", ctx, pid, limitMB, emitFn)
}

func StartResourceMonitorForProject(projectID string, parentCtx context.Context, pid int, limitMB int64, emitFn func(string, interface{})) {
	ctx, cancel := context.WithCancel(parentCtx)
	monitorManager.monitors.Store(projectID, cancel)

	go func() {
		defer func() {
			monitorManager.monitors.Delete(projectID)
			cancel()
		}()

		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		var prevCPUTime int64
		var prevSampleTime time.Time

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				now := time.Now()
				ramMB, cpuTime, err := getProcessStats(pid)
				if err != nil {
					return
				}

				var cpuPercent float64
				if !prevSampleTime.IsZero() {
					timeDelta := now.Sub(prevSampleTime).Seconds()
					cpuDelta := float64(cpuTime-prevCPUTime) / 1000.0
					if timeDelta > 0 {
						cpuPercent = (cpuDelta / timeDelta) * 100.0
						if cpuPercent < 0 {
							cpuPercent = 0
						}
						if cpuPercent > 100.0 {
							cpuPercent = 100.0
						}
					}
				}

				prevCPUTime = cpuTime
				prevSampleTime = now

				ramPercent := 0.0
				if limitMB > 0 {
					ramPercent = (float64(ramMB) / float64(limitMB)) * 100.0
				}

				emitFn("resource-usage", map[string]interface{}{
					"projectID":  projectID,
					"ramMB":      ramMB,
					"ramPercent": ramPercent,
					"cpuPercent": cpuPercent,
					"timestamp":  now.UnixMilli(),
				})
			}
		}
	}()
}

func StopMonitorForProject(projectID string) {
	if val, ok := monitorManager.monitors.Load(projectID); ok {
		if cancel, ok := val.(context.CancelFunc); ok {
			cancel()
		}
		monitorManager.monitors.Delete(projectID)
	}
}
