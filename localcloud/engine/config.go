package engine

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type RunConfigSave struct {
	ScriptName   string  `json:"scriptName"`
	Port         int     `json:"port"`
	MemoryMB     int64   `json:"memoryMB"`
	CPUCores     float64 `json:"cpuCores"`
	VercelSync   bool    `json:"vercelSync"`
	VercelEnvKey string  `json:"vercelEnvKey"`
	TunnelMode   string  `json:"tunnelMode"` // "ephemeral" or "permanent"
}

type WindowBounds struct {
	X      int `json:"x"`
	Y      int `json:"y"`
	Width  int `json:"width"`
	Height int `json:"height"`
}

type AppConfig struct {
	LastProjectPath string         `json:"lastProjectPath"`
	LastRunConfig   *RunConfigSave `json:"lastRunConfig,omitempty"`
	WindowBounds    *WindowBounds  `json:"windowBounds,omitempty"`
}

func getConfigFile() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(configDir, "localcloud")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
}

// LoadConfig reads the configuration file from disk.
func LoadConfig() (*AppConfig, error) {
	file, err := getConfigFile()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(file)
	if err != nil {
		// If file doesn't exist, return a default empty config
		if os.IsNotExist(err) {
			return &AppConfig{}, nil
		}
		return nil, err
	}

	var cfg AppConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

// SaveConfig writes the configuration file to disk.
func SaveConfig(cfg *AppConfig) error {
	file, err := getConfigFile()
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(file, data, 0600)
}
