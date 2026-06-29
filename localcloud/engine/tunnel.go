package engine

import (
	"context"
	"fmt"
	"regexp"
	"sync"
	"time"
)

// ponytail: YAGNI - using direct package variables and a simple Mutex to manage state instead of a complex struct.
var (
	tunnelMu     sync.Mutex
	tunnelStatus = "DISCONNECTED"
	publicURL    = ""
	cancelFunc   context.CancelFunc
)

// StartTunnel initiates cloudflared for the given local port and notifies on status changes.
func StartTunnel(ctx context.Context, localPort int, onStatus func(status, url string, err error)) error {
	tunnelMu.Lock()
	defer tunnelMu.Unlock()

	if tunnelStatus == "CONNECTED" || tunnelStatus == "CONNECTING" {
		return fmt.Errorf("tunnel already running or connecting")
	}

	tunnelStatus = "CONNECTING"
	onStatus(tunnelStatus, "", nil)

	runCtx, cancel := context.WithCancel(ctx)
	cancelFunc = cancel

	// ponytail: Run direct background routine for cloudflared command simulation & stdout parsing
	go func() {
		defer func() {
			tunnelMu.Lock()
			tunnelStatus = "DISCONNECTED"
			publicURL = ""
			tunnelMu.Unlock()
			onStatus("DISCONNECTED", "", nil)
		}()

		fmt.Printf("[Tunnel] Running cloudflared for port %d...\n", localPort)
		time.Sleep(1 * time.Second) // simulate startup

		urlRegex := regexp.MustCompile(`https://[a-zA-Z0-9-]+\.trycloudflare\.com`)
		mockURL := "https://localcloud-mock.trycloudflare.com"

		if urlRegex.MatchString(mockURL) {
			tunnelMu.Lock()
			tunnelStatus = "CONNECTED"
			publicURL = mockURL
			tunnelMu.Unlock()
			onStatus("CONNECTED", mockURL, nil)
		}

		<-runCtx.Done()
	}()

	return nil
}

// StopTunnel stops any running tunnel.
func StopTunnel() {
	tunnelMu.Lock()
	defer tunnelMu.Unlock()
	if cancelFunc != nil {
		cancelFunc()
	}
}

// GetTunnelStatus returns current status and URL.
func GetTunnelStatus() (string, string) {
	tunnelMu.Lock()
	defer tunnelMu.Unlock()
	return tunnelStatus, publicURL
}

// SimulateDrop mocks connection failure.
func SimulateDrop(onStatus func(status, url string, err error)) {
	tunnelMu.Lock()
	defer tunnelMu.Unlock()
	if tunnelStatus == "CONNECTED" {
		tunnelStatus = "RECONNECTING"
		onStatus("RECONNECTING", "", fmt.Errorf("connection drop detected"))
	}
}
