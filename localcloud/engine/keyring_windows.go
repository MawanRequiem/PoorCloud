//go:build windows

package engine

import (
	"fmt"
	"os"
	"path/filepath"
	"unsafe"

	"golang.org/x/sys/windows"
)

func getSecretsDir() (string, error) {
	appData, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(appData, "localcloud", "secrets")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return dir, nil
}

func storeSecretPlatform(service, key, value string) error {
	dir, err := getSecretsDir()
	if err != nil {
		return err
	}

	data := []byte(value)
	if len(data) == 0 {
		return fmt.Errorf("cannot store empty secret")
	}

	var inBlob, outBlob windows.DataBlob
	inBlob.Size = uint32(len(data))
	inBlob.Data = &data[0]

	// Call DPAPI CryptProtectData
	err = windows.CryptProtectData(&inBlob, nil, nil, 0, nil, 0, &outBlob)
	if err != nil {
		return fmt.Errorf("DPAPI encryption failed: %w", err)
	}
	defer windows.LocalFree(windows.Handle(unsafe.Pointer(outBlob.Data)))

	// Copy outBlob.Data into a slice
	encrypted := make([]byte, outBlob.Size)
	for i := uint32(0); i < outBlob.Size; i++ {
		encrypted[i] = *(*byte)(unsafe.Pointer(uintptr(unsafe.Pointer(outBlob.Data)) + uintptr(i)))
	}

	serviceDir := filepath.Join(dir, service)
	if err := os.MkdirAll(serviceDir, 0700); err != nil {
		return err
	}

	filePath := filepath.Join(serviceDir, key+".enc")
	return os.WriteFile(filePath, encrypted, 0600)
}

func getSecretPlatform(service, key string) (string, error) {
	dir, err := getSecretsDir()
	if err != nil {
		return "", err
	}

	filePath := filepath.Join(dir, service, key+".enc")
	encrypted, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	if len(encrypted) == 0 {
		return "", fmt.Errorf("empty encrypted file")
	}

	var inBlob, outBlob windows.DataBlob
	inBlob.Size = uint32(len(encrypted))
	inBlob.Data = &encrypted[0]

	// Call DPAPI CryptUnprotectData
	err = windows.CryptUnprotectData(&inBlob, nil, nil, 0, nil, 0, &outBlob)
	if err != nil {
		return "", fmt.Errorf("DPAPI decryption failed: %w", err)
	}
	defer windows.LocalFree(windows.Handle(unsafe.Pointer(outBlob.Data)))

	decrypted := make([]byte, outBlob.Size)
	for i := uint32(0); i < outBlob.Size; i++ {
		decrypted[i] = *(*byte)(unsafe.Pointer(uintptr(unsafe.Pointer(outBlob.Data)) + uintptr(i)))
	}

	return string(decrypted), nil
}

func deleteSecretPlatform(service, key string) error {
	dir, err := getSecretsDir()
	if err != nil {
		return err
	}

	filePath := filepath.Join(dir, service, key+".enc")
	return os.Remove(filePath)
}
