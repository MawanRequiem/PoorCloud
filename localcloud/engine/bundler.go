package engine

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// ponytail: stdlib net/http + archive/zip. Zero external deps.

const (
	bunMaxSize   = 100 * 1024 * 1024 // 100 MB
	bunCacheDir  = "runtimes"
	bunCacheFile = "bun"
)

type countingWriter struct {
	total     int64
	onProgress func(percent int)
}

func (cw *countingWriter) Write(p []byte) (int, error) {
	n := len(p)
	cw.total += int64(n)
	// onProgress is called externally, not per-write
	return n, nil
}

// DownloadBunPortable downloads the bun portable binary, extracting it.
// Returns the path to the extracted bun binary.
func DownloadBunPortable(ctx context.Context, destDir string, onProgress func(percent int)) (string, error) {
	bunDir := filepath.Join(destDir, bunCacheDir)
	if err := os.MkdirAll(bunDir, 0755); err != nil {
		return "", fmt.Errorf("mkdir bun cache: %w", err)
	}

	bunPath := filepath.Join(bunDir, bunCacheFile)
	if runtime.GOOS == "windows" {
		bunPath += ".exe"
	}

	// Check if already cached
	if info, err := os.Stat(bunPath); err == nil && info.Size() > 0 {
		if err := os.Chmod(bunPath, 0755); err == nil {
			return bunPath, nil
		}
	}

	platform := runtime.GOOS
	arch := runtime.GOARCH
	if arch == "amd64" {
		arch = "x64"
	}
	downloadURL := fmt.Sprintf("https://github.com/oven-sh/bun/releases/latest/download/bun-%s-%s.zip", platform, arch)

	req, err := http.NewRequestWithContext(ctx, "GET", downloadURL, nil)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("download bun: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download bun: HTTP %d", resp.StatusCode)
	}

	// Download to temp file
	tmpFile, err := os.CreateTemp("", "bun-*.zip")
	if err != nil {
		return "", fmt.Errorf("create temp file: %w", err)
	}
	tmpPath := tmpFile.Name()
	defer os.Remove(tmpPath)

	// Track progress
	var downloaded int64
	buf := make([]byte, 32*1024)
	for {
		select {
		case <-ctx.Done():
			tmpFile.Close()
			return "", ctx.Err()
		default:
		}

		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, writeErr := tmpFile.Write(buf[:n]); writeErr != nil {
				tmpFile.Close()
				return "", fmt.Errorf("write temp file: %w", writeErr)
			}
			downloaded += int64(n)
			if downloaded > bunMaxSize {
				tmpFile.Close()
				return "", fmt.Errorf("download too large (>100MB)")
			}
			if onProgress != nil && resp.ContentLength > 0 {
				pct := int(downloaded * 100 / resp.ContentLength)
				if pct > 100 {
					pct = 100
				}
				onProgress(pct)
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			tmpFile.Close()
			return "", fmt.Errorf("read response: %w", readErr)
		}
	}
	tmpFile.Close()

	// Extract zip
	zipReader, err := zip.OpenReader(tmpPath)
	if err != nil {
		return "", fmt.Errorf("open zip: %w", err)
	}
	defer zipReader.Close()

	var extracted bool
	for _, f := range zipReader.File {
		// Look for the bun binary
		if f.FileInfo().IsDir() {
			continue
		}
		name := filepath.Base(f.Name)
		if runtime.GOOS == "windows" {
			if !strings.EqualFold(name, "bun.exe") && !strings.EqualFold(name, "bun") {
				continue
			}
		} else {
			if name != "bun" {
				continue
			}
		}

		src, err := f.Open()
		if err != nil {
			return "", fmt.Errorf("open zip entry: %w", err)
		}

		dst, err := os.OpenFile(bunPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0755)
		if err != nil {
			src.Close()
			return "", fmt.Errorf("create bun binary: %w", err)
		}

		_, err = io.Copy(dst, src)
		src.Close()
		dst.Close()
		if err != nil {
			return "", fmt.Errorf("extract bun: %w", err)
		}

		extracted = true
		break
	}

	if !extracted {
		return "", fmt.Errorf("bun binary not found in zip archive")
	}

	if runtime.GOOS != "windows" {
		os.Chmod(bunPath, 0755)
	}

	return bunPath, nil
}

// FindBunPortable checks if Bun is already cached locally.
func FindBunPortable(destDir string) (string, bool) {
	bunPath := filepath.Join(destDir, bunCacheDir, bunCacheFile)
	if runtime.GOOS == "windows" {
		bunPath += ".exe"
	}
	info, err := os.Stat(bunPath)
	if err != nil {
		return "", false
	}
	return bunPath, info.Size() > 0
}
