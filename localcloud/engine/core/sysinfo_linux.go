//go:build linux

package core

// callGlobalMemoryStatusEx is not used on Linux; ram is read from /proc/meminfo.
func callGlobalMemoryStatusEx() int64 {
	return 4096
}
