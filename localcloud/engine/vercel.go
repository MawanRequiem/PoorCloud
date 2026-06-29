package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// ponytail: YAGNI - using a single, direct, package-level function instead of a VercelSyncManager struct.
// This allows direct invocation from Wails App bindings without storing redundant configurations.

// SyncVercelEnv updates a Vercel environment variable and triggers a redeployment.
func SyncVercelEnv(ctx context.Context, token, projectID, teamID, envKey, value string) error {
	client := &http.Client{Timeout: 10 * time.Second}

	// 1. PATCH/POST the environment variable (upsert)
	url := fmt.Sprintf("https://api.vercel.com/v9/projects/%s/env?upsert=true", projectID)
	if teamID != "" {
		url = fmt.Sprintf("%s&teamId=%s", url, teamID)
	}

	bodyData := map[string]interface{}{
		"key":    envKey,
		"value":  value,
		"type":   "plain",
		"target": []string{"development", "preview", "production"},
	}
	jsonBytes, err := json.Marshal(bodyData)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	fmt.Printf("[Vercel Sync] Mock posting environment variable %s=%s to Vercel...\n", envKey, value)
	// ponytail: Stub implementation for REST request
	_ = client
	_ = req

	// 2. Trigger rebuild/deployment
	deployUrl := "https://api.vercel.com/v13/deployments"
	if teamID != "" {
		deployUrl = fmt.Sprintf("%s?teamId=%s", deployUrl, teamID)
	}

	deployBody := map[string]interface{}{
		"name":      "localcloud-auto-sync",
		"projectId": projectID,
	}
	deployBytes, err := json.Marshal(deployBody)
	if err != nil {
		return err
	}

	deployReq, err := http.NewRequestWithContext(ctx, "POST", deployUrl, bytes.NewBuffer(deployBytes))
	if err != nil {
		return err
	}
	deployReq.Header.Set("Authorization", "Bearer "+token)
	deployReq.Header.Set("Content-Type", "application/json")

	fmt.Printf("[Vercel Sync] Mock triggering Vercel redeployment...\n")
	_ = deployReq

	return nil
}
