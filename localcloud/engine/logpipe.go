package engine

import (
	"context"
	"time"
)

// StartLogPipe dispatches batch log lines in 100ms intervals to the UI.
func StartLogPipe(ctx context.Context, logChan <-chan string, emitFn func(eventName string, data interface{})) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	var batch []string
	for {
		select {
		case <-ctx.Done():
			return
		case line, ok := <-logChan:
			if !ok {
				if len(batch) > 0 {
					emitFn("process-log", batch)
				}
				return
			}
			batch = append(batch, line)
		case <-ticker.C:
			if len(batch) == 0 {
				continue
			}
			emitFn("process-log", batch)
			batch = batch[:0] // ponytail: reuse slice capacity to prevent GC allocations
		}
	}
}
