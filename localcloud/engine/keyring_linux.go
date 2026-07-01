//go:build linux

package engine

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"os/user"
	"path/filepath"

	"github.com/godbus/dbus/v5"
)

func getSecretsDirLinux() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, ".config", "localcloud", "secrets")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return dir, nil
}

func storeSecretPlatform(service, key, value string) error {
	// Try D-Bus Secret Service first
	if err := storeSecretDBus(service, key, value); err == nil {
		return nil
	}

	// ponytail: fallback encryption when D-Bus is unavailable (e.g. headless)
	encrypted, err := encryptAES(value)
	if err != nil {
		return err
	}

	dir, err := getSecretsDirLinux()
	if err != nil {
		return err
	}

	serviceDir := filepath.Join(dir, service)
	if err := os.MkdirAll(serviceDir, 0700); err != nil {
		return err
	}

	filePath := filepath.Join(serviceDir, key+".enc")
	return os.WriteFile(filePath, encrypted, 0600)
}

func getSecretPlatform(service, key string) (string, error) {
	// Try D-Bus Secret Service first
	if val, err := getSecretDBus(service, key); err == nil {
		return val, nil
	}

	// Fallback decryption
	dir, err := getSecretsDirLinux()
	if err != nil {
		return "", err
	}

	filePath := filepath.Join(dir, service, key+".enc")
	encrypted, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	return decryptAES(encrypted)
}

func deleteSecretPlatform(service, key string) error {
	// Try delete from D-Bus first
	_ = deleteSecretDBus(service, key)

	dir, err := getSecretsDirLinux()
	if err != nil {
		return err
	}

	filePath := filepath.Join(dir, service, key+".enc")
	_ = os.Remove(filePath)
	return nil
}

// ponytail: Helper to interact with Freedesktop Secret Service API over D-Bus
func storeSecretDBus(service, key, value string) error {
	conn, err := dbus.SessionBus()
	if err != nil {
		return err
	}

	// Open session (plain text transport)
	obj := conn.Object("org.freedesktop.secrets", "/org/freedesktop/secrets")
	var session dbus.ObjectPath
	var output dbus.Variant
	err = obj.Call("org.freedesktop.Secret.Service.OpenSession", 0, "plain", dbus.MakeVariant("")).Store(&output, &session)
	if err != nil {
		return err
	}

	// Prepare secret structure: [session_path, parameters, value_bytes, content_type]
	secret := struct {
		Session     dbus.ObjectPath
		Parameters  []byte
		Value       []byte
		ContentType string
	}{
		Session:     session,
		Parameters:  []byte{},
		Value:       []byte(value),
		ContentType: "text/plain",
	}

	// Properties and Attributes
	props := map[string]dbus.Variant{
		"org.freedesktop.Secret.Item.Label": dbus.MakeVariant(fmt.Sprintf("LocalCloud - %s/%s", service, key)),
	}
	attributes := map[string]string{
		"service":     service,
		"key":         key,
		"application": "localcloud",
	}

	// Call CreateItem on default collection
	defaultCol := conn.Object("org.freedesktop.secrets", "/org/freedesktop/secrets/collection/default")
	var item dbus.ObjectPath
	var prompt dbus.ObjectPath
	err = defaultCol.Call("org.freedesktop.Secret.Collection.CreateItem", 0, props, secret, attributes, true).Store(&item, &prompt)
	return err
}

func getSecretDBus(service, key string) (string, error) {
	conn, err := dbus.SessionBus()
	if err != nil {
		return "", err
	}

	// Search items by attributes
	defaultCol := conn.Object("org.freedesktop.secrets", "/org/freedesktop/secrets/collection/default")
	attributes := map[string]string{
		"service":     service,
		"key":         key,
		"application": "localcloud",
	}
	var items []dbus.ObjectPath
	var locked []dbus.ObjectPath
	err = defaultCol.Call("org.freedesktop.Secret.Collection.SearchItems", 0, attributes).Store(&items, &locked)
	if err != nil || len(items) == 0 {
		return "", fmt.Errorf("secret not found in D-Bus")
	}

	// Open session for decryption
	obj := conn.Object("org.freedesktop.secrets", "/org/freedesktop/secrets")
	var session dbus.ObjectPath
	var output dbus.Variant
	err = obj.Call("org.freedesktop.Secret.Service.OpenSession", 0, "plain", dbus.MakeVariant("")).Store(&output, &session)
	if err != nil {
		return "", err
	}

	// Call GetSecret on the found item
	itemObj := conn.Object("org.freedesktop.secrets", items[0])
	var secret struct {
		Session     dbus.ObjectPath
		Parameters  []byte
		Value       []byte
		ContentType string
	}
	err = itemObj.Call("org.freedesktop.Secret.Item.GetSecret", 0, session).Store(&secret)
	if err != nil {
		return "", err
	}

	return string(secret.Value), nil
}

func deleteSecretDBus(service, key string) error {
	conn, err := dbus.SessionBus()
	if err != nil {
		return err
	}

	defaultCol := conn.Object("org.freedesktop.secrets", "/org/freedesktop/secrets/collection/default")
	attributes := map[string]string{
		"service":     service,
		"key":         key,
		"application": "localcloud",
	}
	var items []dbus.ObjectPath
	var locked []dbus.ObjectPath
	err = defaultCol.Call("org.freedesktop.Secret.Collection.SearchItems", 0, attributes).Store(&items, &locked)
	if err != nil || len(items) == 0 {
		return nil
	}

	itemObj := conn.Object("org.freedesktop.secrets", items[0])
	var prompt dbus.ObjectPath
	return itemObj.Call("org.freedesktop.Secret.Item.Delete", 0).Store(&prompt)
}

func encryptAES(plaintext string) ([]byte, error) {
	key, err := getFallbackKey()
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return ciphertext, nil
}

func decryptAES(ciphertext []byte) (string, error) {
	key, err := getFallbackKey()
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(ciphertext) < gcm.NonceSize() {
		return "", fmt.Errorf("ciphertext too short")
	}
	nonce := ciphertext[:gcm.NonceSize()]
	actualCiphertext := ciphertext[gcm.NonceSize()]
	plaintext, err := gcm.Open(nil, nonce, actualCiphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

func getFallbackKey() ([]byte, error) {
	machineID, err := os.ReadFile("/etc/machine-id")
	if err != nil {
		machineID, err = os.ReadFile("/var/lib/dbus/machine-id")
		if err != nil {
			machineID = []byte("localcloud-fallback-salt")
		}
	}
	u, err := user.Current()
	var uid string
	if err == nil {
		uid = u.Uid
	} else {
		uid = "unknown"
	}
	seed := string(machineID) + ":" + uid
	hash := sha256.Sum256([]byte(seed))
	return hash[:], nil
}
