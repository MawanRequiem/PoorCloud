package process

import (
	"context"
	"time"
)

// StartResourceMonitor gathers process CPU/RAM statistics every 1s and emits them.
func StartResourceMonitor(ctx context.Context, pid int, limitMB int64, emitFn func(string, interface{})) {
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
				// Process probably stopped
				return
			}

			var cpuPercent float64
			if !prevSampleTime.IsZero() {
				timeDelta := now.Sub(prevSampleTime).Seconds()
				cpuDelta := float64(cpuTime-prevCPUTime) / 1000.0 // ms to seconds
				if timeDelta > 0 {
					cpuPercent = (cpuDelta / timeDelta) * 100.0
					if cpuPercent < 0 {
						cpuPercent = 0
					}
					// Normalize for display (cap at 100% per core)
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
				"ramMB":      ramMB,
				"ramPercent": ramPercent,
				"cpuPercent": cpuPercent,
				"timestamp":  now.UnixMilli(),
			})
		}
	}
}
