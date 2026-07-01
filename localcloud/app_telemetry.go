package main

import (
	"localcloud/engine"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// StartEphemeralTunnel starts the free Cloudflare tunnel and emits status to frontend
func (a *App) StartEphemeralTunnel(localPort int) error {
	return engine.StartTunnel(a.ctx, localPort, func(status, url string, err error) {
		errMsg := ""
		if err != nil {
			errMsg = err.Error()
		}
		wailsRuntime.EventsEmit(a.ctx, "tunnel-status", map[string]string{
			"status": status,
			"url":    url,
			"error":  errMsg,
		})
	})
}

// StartPermanentTunnel starts a named Cloudflare tunnel with custom CNAME
func (a *App) StartPermanentTunnel(localPort int, domain, accountID, apiToken, tunnelName string) error {
	cfg := engine.TunnelConfig{
		LocalPort:  localPort,
		Domain:     domain,
		AccountID:  accountID,
		APIToken:   apiToken,
		TunnelName: tunnelName,
	}
	return engine.StartPermanentTunnel(a.ctx, cfg, func(status, url string, err error) {
		errMsg := ""
		if err != nil {
			errMsg = err.Error()
		}
		wailsRuntime.EventsEmit(a.ctx, "tunnel-status", map[string]string{
			"status": status,
			"url":    url,
			"error":  errMsg,
		})
	})
}

// StopTunnel stops any running tunnel
func (a *App) StopTunnel() {
	engine.StopTunnel()
	engine.StopPermanentTunnel()
}

// SyncVercel wraps engine.SyncVercelEnv
func (a *App) SyncVercel(token, projectId, teamId, envKey, value string) error {
	return engine.SyncVercelEnv(a.ctx, token, projectId, teamId, envKey, value)
}

// StoreCredential saves a token in the secure OS keyring
func (a *App) StoreCredential(service, key, value string) error {
	return engine.StoreSecret(service, key, value)
}

// HasCredential checks if a credential exists in the keyring
func (a *App) HasCredential(service, key string) bool {
	_, err := engine.GetSecret(service, key)
	return err == nil
}

// DeleteCredential removes a token from the secure OS keyring
func (a *App) DeleteCredential(service, key string) error {
	return engine.DeleteSecret(service, key)
}

// LoadConfig reads the persisted JSON configuration
func (a *App) LoadConfig() (*engine.AppConfig, error) {
	return engine.LoadConfig()
}

// SaveConfig writes the persistent configuration
func (a *App) SaveConfig(cfg engine.AppConfig) error {
	return engine.SaveConfig(&cfg)
}
