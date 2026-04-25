package data

import (
	"bufio"
	"os"
	"strings"
)

// LoadDotenv parses a simple KEY=value file and sets each pair via os.Setenv,
// without overwriting variables already present in the environment. It is a
// best-effort helper for local dev — production env should be set via systemd
// or the deploy pipeline.
func LoadDotenv(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		eq := strings.Index(line, "=")
		if eq <= 0 {
			continue
		}
		key := strings.TrimSpace(line[:eq])
		val := strings.TrimSpace(line[eq+1:])
		val = strings.Trim(val, `"'`)
		if _, ok := os.LookupEnv(key); ok {
			continue
		}
		_ = os.Setenv(key, val)
	}
	return sc.Err()
}
