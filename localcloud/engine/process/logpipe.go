package process

import (
	"context"
	"sync"
	"time"
)

type LogPipeManager struct {
	pipes sync.Map
}

var logPipeManager = &LogPipeManager{}

func StartLogPipe(ctx context.Context, logChan <-chan string, emitFn func(eventName string, data interface{})) {
	StartLogPipeForProject("", ctx, logChan, emitFn)
}

func StartLogPipeForProject(projectID string, parentCtx context.Context, logChan <-chan string, emitFn func(eventName string, data interface{})) {
	ctx, cancel := context.WithCancel(parentCtx)
	logPipeManager.pipes.Store(projectID, cancel)

	go func() {
		defer func() {
			logPipeManager.pipes.Delete(projectID)
			cancel()
		}()

		ticker := time.NewTicker(100 * time.Millisecond)
		defer ticker.Stop()

		var batch []string
		for {
			select {
			case <-ctx.Done():
				if len(batch) > 0 {
					emitFn("process-log", map[string]interface{}{
						"projectID": projectID,
						"lines":     batch,
					})
				}
				return
			case line, ok := <-logChan:
				if !ok {
					if len(batch) > 0 {
						emitFn("process-log", map[string]interface{}{
							"projectID": projectID,
							"lines":     batch,
						})
					}
					return
				}
				batch = append(batch, line)
			case <-ticker.C:
				if len(batch) == 0 {
					continue
				}
				emitFn("process-log", map[string]interface{}{
					"projectID": projectID,
					"lines":     batch,
				})
				batch = batch[:0]
			}
		}
	}()
}

func StopLogPipeForProject(projectID string) {
	if val, ok := logPipeManager.pipes.Load(projectID); ok {
		if cancel, ok := val.(context.CancelFunc); ok {
			cancel()
		}
		logPipeManager.pipes.Delete(projectID)
	}
}
