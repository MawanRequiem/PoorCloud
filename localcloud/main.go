package main

import (
	"context"
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	wailsWindows "github.com/wailsapp/wails/v2/pkg/options/windows"
	"localcloud/engine/process"
	"localcloud/engine/projects"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "localcloud",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup: app.startup,
		OnShutdown: func(ctx context.Context) {
			process.CleanupZombies()
			// Stop all running projects on shutdown
			for _, p := range projects.ListProjects() {
				if p.Status == "running" {
					_ = projects.StopProject(p.ProjectID)
				}
			}
		},
		Bind: []interface{}{
			app,
		},
		Windows: &wailsWindows.Options{
			// Hardening: Prevent capturing sensitive API tokens and credentials in screenshots or screen recording
			ContentProtection: true,
			// Hardening: Restrict DLL loading path to System32 and Application directory to prevent DLL hijacking
			DLLSearchPaths: wailsWindows.DLLSearchSystem32 | wailsWindows.DLLSearchApplicationDir,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
