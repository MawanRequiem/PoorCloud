package tunnel

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"localcloud/engine/core"
)

type TunnelConfig struct {
	LocalPort  int
	Domain     string // e.g. "api.mysite.com"
	AccountID  string // Cloudflare account ID
	APIToken   string // Cloudflare API Token
	TunnelName string // unique name for this tunnel
}

var (
	permMu        sync.Mutex
	permCancel    context.CancelFunc
	permCmd       *exec.Cmd
	permCredsFile string
	permTunnelID  string
	permRecordID  string
	permZoneID    string
	permConfig    TunnelConfig
	permRunning   bool
)

// StartPermanentTunnel configures a named tunnel and routes custom DNS to it.
func StartPermanentTunnel(ctx context.Context, cfg TunnelConfig, onStatus func(status, url string, err error)) error {
	permMu.Lock()
	if permRunning {
		permMu.Unlock()
		return fmt.Errorf("permanent tunnel already running")
	}
	permRunning = true
	permConfig = cfg
	permMu.Unlock()

	runCtx, cancel := context.WithCancel(ctx)
	permMu.Lock()
	permCancel = cancel
	permMu.Unlock()

	onStatus("CONNECTING", "", nil)

	// Step 1: Generate tunnel secret
	secretBytes := make([]byte, 32)
	if _, err := rand.Read(secretBytes); err != nil {
		permReset()
		return err
	}
	tunnelSecret := base64.StdEncoding.EncodeToString(secretBytes)

	client := &http.Client{Timeout: 15 * time.Second}

	// Step 2: Create Named Tunnel
	// POST https://api.cloudflare.com/client/v4/accounts/{account_id}/tunnels
	tunnelURL := fmt.Sprintf("https://api.cloudflare.com/client/v4/accounts/%s/tunnels", cfg.AccountID)
	tunnelReqBody := map[string]string{
		"name":          cfg.TunnelName,
		"tunnel_secret": tunnelSecret,
	}
	jsonBytes, err := json.Marshal(tunnelReqBody)
	if err != nil {
		permReset()
		return err
	}

	req, err := http.NewRequestWithContext(runCtx, "POST", tunnelURL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		permReset()
		return err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.APIToken)
	req.Header.Set("Content-Type", "application/json")

	fmt.Printf("[Permanent Tunnel] Creating tunnel %s on Cloudflare...\n", cfg.TunnelName)
	resp, err := client.Do(req)
	if err != nil {
		permReset()
		return fmt.Errorf("failed to call create tunnel API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		permReset()
		return fmt.Errorf("create tunnel failed (status %d): %s", resp.StatusCode, string(body))
	}

	var tunnelResp struct {
		Result struct {
			ID string `json:"id"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tunnelResp); err != nil {
		permReset()
		return err
	}
	tunnelID := tunnelResp.Result.ID
	permMu.Lock()
	permTunnelID = tunnelID
	permMu.Unlock()

	// Step 3: Find Zone ID for Domain
	// GET https://api.cloudflare.com/client/v4/zones
	zonesURL := "https://api.cloudflare.com/client/v4/zones"
	req, err = http.NewRequestWithContext(runCtx, "GET", zonesURL, nil)
	if err != nil {
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.APIToken)

	fmt.Printf("[Permanent Tunnel] Finding DNS zone for domain %s...\n", cfg.Domain)
	resp, err = client.Do(req)
	if err != nil {
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return fmt.Errorf("failed to call list zones API: %w", err)
	}
	defer resp.Body.Close()

	var zonesResp struct {
		Result []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&zonesResp); err != nil {
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return err
	}

	var zoneID string
	for _, z := range zonesResp.Result {
		if z.Name == cfg.Domain || strings.HasSuffix(cfg.Domain, "."+z.Name) {
			zoneID = z.ID
			break
		}
	}
	if zoneID == "" {
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return fmt.Errorf("no matching Cloudflare DNS zone found for domain %s", cfg.Domain)
	}
	permMu.Lock()
	permZoneID = zoneID
	permMu.Unlock()

	// Step 4: Create DNS CNAME Record
	// POST https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records
	dnsURL := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records", zoneID)
	dnsReqBody := map[string]interface{}{
		"type":    "CNAME",
		"name":    cfg.Domain,
		"content": fmt.Sprintf("%s.cfargotunnel.com", tunnelID),
		"proxied": true,
	}
	jsonBytes, err = json.Marshal(dnsReqBody)
	if err != nil {
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return err
	}

	req, err = http.NewRequestWithContext(runCtx, "POST", dnsURL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.APIToken)
	req.Header.Set("Content-Type", "application/json")

	fmt.Printf("[Permanent Tunnel] Creating DNS CNAME record for %s...\n", cfg.Domain)
	resp, err = client.Do(req)
	if err != nil {
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return fmt.Errorf("failed to create DNS CNAME record: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return fmt.Errorf("create DNS record failed (status %d): %s", resp.StatusCode, string(body))
	}

	var dnsResp struct {
		Result struct {
			ID string `json:"id"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&dnsResp); err != nil {
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return err
	}
	recordID := dnsResp.Result.ID
	permMu.Lock()
	permRecordID = recordID
	permMu.Unlock()

	// Step 5: Write credentials JSON file
	credsData := map[string]string{
		"AccountTag":   cfg.AccountID,
		"TunnelSecret": tunnelSecret,
		"TunnelID":     tunnelID,
	}
	credsBytes, err := json.Marshal(credsData)
	if err != nil {
		_ = deleteDNSRecordAPI(zoneID, cfg.APIToken, recordID)
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return err
	}

	credsFile := filepath.Join(os.TempDir(), fmt.Sprintf("localcloud-cf-%s.json", tunnelID))
	if err := os.WriteFile(credsFile, credsBytes, 0600); err != nil {
		_ = deleteDNSRecordAPI(zoneID, cfg.APIToken, recordID)
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return err
	}
	permMu.Lock()
	permCredsFile = credsFile
	permMu.Unlock()

	// Step 6: Find cloudflared path and run
	binPath, err := findCloudflared()
	if err != nil {
		_ = os.Remove(credsFile)
		_ = deleteDNSRecordAPI(zoneID, cfg.APIToken, recordID)
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return err
	}

	cmdArgs := []string{"tunnel", "run", "--credentials-file", credsFile, cfg.TunnelName}
	cmd := exec.CommandContext(runCtx, binPath, cmdArgs...)
	core.SetPlatformSysProcAttr(cmd)

	permMu.Lock()
	permCmd = cmd
	permMu.Unlock()

	if err := cmd.Start(); err != nil {
		_ = os.Remove(credsFile)
		_ = deleteDNSRecordAPI(zoneID, cfg.APIToken, recordID)
		_ = deleteTunnelAPI(cfg.AccountID, cfg.APIToken, tunnelID)
		permReset()
		return err
	}

	// Goroutine to monitor execution
	go func() {
		defer func() {
			permMu.Lock()
			credsFileCleanup := permCredsFile
			tID := permTunnelID
			rID := permRecordID
			zID := permZoneID
			tToken := permConfig.APIToken
			tAcc := permConfig.AccountID
			permMu.Unlock()

			// Clean up credentials file
			if credsFileCleanup != "" {
				_ = os.Remove(credsFileCleanup)
			}

			// Delete DNS record and named tunnel in the background
			if zID != "" && rID != "" {
				fmt.Printf("[Permanent Tunnel] Cleaning up DNS CNAME record...\n")
				_ = deleteDNSRecordAPI(zID, tToken, rID)
			}
			if tAcc != "" && tID != "" {
				fmt.Printf("[Permanent Tunnel] Cleaning up Cloudflare Tunnel configuration...\n")
				_ = deleteTunnelAPI(tAcc, tToken, tID)
			}

			permMu.Lock()
			permReset()
			permMu.Unlock()

			onStatus("DISCONNECTED", "", nil)
		}()

		// Wait 3 seconds to confirm it didn't crash instantly
		time.Sleep(3 * time.Second)
		if cmd.ProcessState != nil && cmd.ProcessState.Exited() {
			return
		}

		onStatus("CONNECTED", fmt.Sprintf("https://%s", cfg.Domain), nil)

		// Block until process exits or is killed by cancelFunc
		_ = cmd.Wait()
	}()

	return nil
}

// StopPermanentTunnel shuts down the permanent tunnel process and triggers cleanup.
func StopPermanentTunnel() {
	permMu.Lock()
	defer permMu.Unlock()
	if permCancel != nil {
		permCancel()
	}
	if permCmd != nil && permCmd.Process != nil {
		_ = permCmd.Process.Kill()
	}
}

func permReset() {
	permCancel = nil
	permCmd = nil
	permCredsFile = ""
	permTunnelID = ""
	permRecordID = ""
	permZoneID = ""
	permRunning = false
}

func deleteTunnelAPI(accountID, apiToken, tunnelID string) error {
	client := &http.Client{Timeout: 10 * time.Second}
	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/accounts/%s/tunnels/%s", accountID, tunnelID)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiToken)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func deleteDNSRecordAPI(zoneID, apiToken, recordID string) error {
	client := &http.Client{Timeout: 10 * time.Second}
	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records/%s", zoneID, recordID)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiToken)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}
