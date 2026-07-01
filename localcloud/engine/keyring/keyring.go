package keyring

// StoreSecret stores a credential securely.
func StoreSecret(service, key, value string) error {
	return storeSecretPlatform(service, key, value)
}

// GetSecret retrieves a credential securely.
func GetSecret(service, key string) (string, error) {
	return getSecretPlatform(service, key)
}

// DeleteSecret removes a credential from secure storage.
func DeleteSecret(service, key string) error {
	return deleteSecretPlatform(service, key)
}
