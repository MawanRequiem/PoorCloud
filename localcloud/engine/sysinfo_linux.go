//go:build linux

package engine

// callGlobalMemoryStatusEx is not used on Linux; ram is read from /proc/meminfo.
func callGlobalMemoryStatusEx() int64 {
	return 4096
}
