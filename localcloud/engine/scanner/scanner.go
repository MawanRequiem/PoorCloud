package scanner

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sync"
	"time"
)

// ponytail: one struct, one function, zero external deps. All stdlib.

// ScanResult represents the parsed result of scanning a project directory.
type ScanResult struct {
	Name          string            `json:"name"`
	Version       string            `json:"version"`
	Scripts       map[string]string `json:"scripts"`
	Dependencies  map[string]string `json:"dependencies"`
	DevCommand    string            `json:"devCommand"`
	DefaultPort   int               `json:"defaultPort"`
	Framework     string            `json:"framework"`
	HasNode       bool              `json:"hasNode"`
	NodeVersion   string            `json:"nodeVersion"`
	HasBun        bool              `json:"hasBun"`
	BunVersion    string            `json:"bunVersion"`
	ProjectPath   string            `json:"projectPath"`
}

// rawPackage is used only internally for JSON unmarshalling.
type rawPackage struct {
	Name            string            `json:"name"`
	Version         string            `json:"version"`
	Scripts         map[string]string `json:"scripts"`
	Dependencies    map[string]string `json:"dependencies"`
	DevDependencies map[string]string `json:"devDependencies"`
}

var (
	scanCache   *ScanResult
	scanCacheMu sync.Mutex
	scanCacheMod time.Time

	runtimeCache   struct {
		hasNode      bool
		nodeVersion  string
		hasBun       bool
		bunVersion   string
		syncOnce     sync.Once
	}
)

// ScanProject reads package.json from folderPath, detects framework, port, and runtimes.
// ponytail: in-memory cache reuses results if package.json hasn't changed.
func ScanProject(folderPath string) (*ScanResult, error) {
	pkgPath := filepath.Join(folderPath, "package.json")

	stat, err := os.Stat(pkgPath)
	if err != nil {
		return nil, fmt.Errorf("package.json not found in %s", folderPath)
	}

	scanCacheMu.Lock()
	if scanCache != nil && scanCache.ProjectPath == folderPath && !stat.ModTime().After(scanCacheMod) {
		cached := *scanCache
		scanCacheMu.Unlock()
		return &cached, nil
	}
	scanCacheMu.Unlock()

	data, err := os.ReadFile(pkgPath)
	if err != nil {
		return nil, fmt.Errorf("cannot read package.json: %w", err)
	}

	var raw rawPackage
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, fmt.Errorf("invalid package.json: %w", err)
	}

	// Merge dependencies and devDependencies
	allDeps := make(map[string]string)
	for k, v := range raw.Dependencies {
		allDeps[k] = v
	}
	for k, v := range raw.DevDependencies {
		allDeps[k] = v
	}

	framework := detectFramework(allDeps)
	devCommand := detectDevCommand(raw.Scripts)
	defaultPort := detectDefaultPort(devCommand, raw.Scripts, framework)

	runtimeCache.syncOnce.Do(sniffRuntimes)

	result := &ScanResult{
		Name:          raw.Name,
		Version:       raw.Version,
		Scripts:       raw.Scripts,
		Dependencies:  allDeps,
		DevCommand:    devCommand,
		DefaultPort:   defaultPort,
		Framework:     framework,
		HasNode:       runtimeCache.hasNode,
		NodeVersion:   runtimeCache.nodeVersion,
		HasBun:        runtimeCache.hasBun,
		BunVersion:    runtimeCache.bunVersion,
		ProjectPath:   folderPath,
	}

	scanCacheMu.Lock()
	scanCache = result
	scanCacheMod = stat.ModTime()
	scanCacheMu.Unlock()

	return result, nil
}

// ResetRuntimeCache clears the cached runtime detection so it re-runs on next scan.
func ResetRuntimeCache() {
	runtimeCache.syncOnce = sync.Once{}
}

func sniffRuntimes() {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	nodeCmd := exec.CommandContext(ctx, "node", "-v")
	if out, err := nodeCmd.CombinedOutput(); err == nil {
		runtimeCache.hasNode = true
		runtimeCache.nodeVersion = cleanVersion(string(out))
	}

	bunCmd := exec.CommandContext(ctx, "bun", "-v")
	if out, err := bunCmd.CombinedOutput(); err == nil {
		runtimeCache.hasBun = true
		runtimeCache.bunVersion = cleanVersion(string(out))
	}
}

func cleanVersion(s string) string {
	v := regexp.MustCompile(`v?\d+\.\d+\.\d+`).FindString(s)
	if v != "" && v[0] != 'v' {
		v = "v" + v
	}
	return v
}

func detectFramework(deps map[string]string) string {
	if _, ok := deps["next"]; ok {
		return "next"
	}
	if _, ok := deps["vite"]; ok {
		return "vite"
	}
	if _, ok := deps["@remix-run/dev"]; ok {
		return "remix"
	}
	if _, ok := deps["react-scripts"]; ok {
		return "cra"
	}
	return "unknown"
}

func detectDevCommand(scripts map[string]string) string {
	for _, name := range []string{"dev", "start", "serve"} {
		if _, ok := scripts[name]; ok {
			return name
		}
	}
	return ""
}

func detectDefaultPort(scriptName string, scripts map[string]string, framework string) int {
	if scriptName != "" {
		if script, ok := scripts[scriptName]; ok {
			re := regexp.MustCompile(`--port\s+(\d+)|-p\s+(\d+)`)
			matches := re.FindStringSubmatch(script)
			for i := 1; i < len(matches); i++ {
				if matches[i] != "" {
					port := 0
					fmt.Sscanf(matches[i], "%d", &port)
					if port > 0 {
						return port
					}
				}
			}
		}
	}
	switch framework {
	case "next":
		return 3000
	case "vite":
		return 5173
	default:
		return 3000
	}
}
