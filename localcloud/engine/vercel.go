package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

// ponytail: define standard Vercel API errors
var (
	ErrVercelAuth      = errors.New("vercel: authentication failed — check your API token")
	ErrVercelForbidden = errors.New("vercel: access denied — check project and team permissions")
	ErrVercelRateLimit = errors.New("vercel: rate limited — try again later")
	ErrVercelServer    = errors.New("vercel: server error — Vercel may be experiencing issues")
	ErrVercelDeploy    = errors.New("vercel: deployment trigger failed")
)

type VercelConfig struct {
	Token     string
	ProjectID string
	TeamID    string
	EnvKey    string
}

type vercelDeployment struct {
	UID  string `json:"uid"`
	Name string `json:"name"`
}

type vercelDeploymentsResponse struct {
	Deployments []vercelDeployment `json:"deployments"`
}

// SyncVercelEnv updates a Vercel environment variable and triggers a redeployment.
func SyncVercelEnv(ctx context.Context, token, projectID, teamID, envKey, value string) error {
	client := &http.Client{Timeout: 15 * time.Second}

	// 1. Upsert environment variable
	// POST https://api.vercel.com/v9/projects/{projectId}/env?upsert=true
	upsertURL := fmt.Sprintf("https://api.vercel.com/v9/projects/%s/env?upsert=true", projectID)
	if teamID != "" {
		upsertURL = fmt.Sprintf("%s&teamId=%s", upsertURL, teamID)
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

	req, err := http.NewRequestWithContext(ctx, "POST", upsertURL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	fmt.Printf("[Vercel Sync] Updating env var %s to %s for project %s...\n", envKey, value, projectID)
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to make upsert request: %w", err)
	}
	defer resp.Body.Close()

	if err := checkVercelResponse(resp.StatusCode); err != nil {
		return fmt.Errorf("upsert env failed: %w", err)
	}

	// 2. Fetch the latest deployment to redeploy from it
	// GET https://api.vercel.com/v6/deployments?projectId={projectId}&limit=1
	deploymentsURL := fmt.Sprintf("https://api.vercel.com/v6/deployments?projectId=%s&limit=1", projectID)
	if teamID != "" {
		deploymentsURL = fmt.Sprintf("%s&teamId=%s", deploymentsURL, teamID)
	}

	req, err = http.NewRequestWithContext(ctx, "GET", deploymentsURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	fmt.Printf("[Vercel Sync] Fetching latest deployment info...\n")
	resp, err = client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to list deployments: %w", err)
	}
	defer resp.Body.Close()

	if err := checkVercelResponse(resp.StatusCode); err != nil {
		return fmt.Errorf("list deployments failed: %w", err)
	}

	var deplResp vercelDeploymentsResponse
	if err := json.NewDecoder(resp.Body).Decode(&deplResp); err != nil {
		return fmt.Errorf("failed to parse deployments response: %w", err)
	}

	if len(deplResp.Deployments) == 0 {
		return fmt.Errorf("no existing deployments found to trigger redeployment")
	}

	latest := deplResp.Deployments[0]

	// 3. Trigger Redeployment
	// POST https://api.vercel.com/v13/deployments
	redeployURL := "https://api.vercel.com/v13/deployments"
	if teamID != "" {
		redeployURL = fmt.Sprintf("%s?teamId=%s", redeployURL, teamID)
	}

	redeployBody := map[string]interface{}{
		"name":         latest.Name,
		"deploymentId": latest.UID,
	}
	redeployBytes, err := json.Marshal(redeployBody)
	if err != nil {
		return err
	}

	req, err = http.NewRequestWithContext(ctx, "POST", redeployURL, bytes.NewBuffer(redeployBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	fmt.Printf("[Vercel Sync] Triggering redeployment from deployment ID %s (name: %s)...\n", latest.UID, latest.Name)
	resp, err = client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to trigger redeployment: %w", err)
	}
	defer resp.Body.Close()

	if err := checkVercelResponse(resp.StatusCode); err != nil {
		return fmt.Errorf("redeployment failed: %w", err)
	}

	fmt.Printf("[Vercel Sync] Successfully synchronized and redeployed!\n")
	return nil
}

func checkVercelResponse(statusCode int) error {
	switch statusCode {
	case http.StatusOK, http.StatusCreated:
		return nil
	case http.StatusUnauthorized:
		return ErrVercelAuth
	case http.StatusForbidden:
		return ErrVercelForbidden
	case http.StatusTooManyRequests:
		return ErrVercelRateLimit
	default:
		if statusCode >= 500 {
			return ErrVercelServer
		}
		return fmt.Errorf("unexpected status code: %d", statusCode)
	}
}
