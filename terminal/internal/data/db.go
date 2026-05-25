package data

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	poolOnce sync.Once
	pool     *pgxpool.Pool
	poolErr  error
)

// Pool returns a process-wide pgxpool, opened lazily on first call. Reads
// DATABASE_URL from the env — there is no fallback, since the terminal needs
// a database connection to render any meaningful screen.
func Pool(ctx context.Context) (*pgxpool.Pool, error) {
	poolOnce.Do(func() {
		url := os.Getenv("DATABASE_URL")
		if url == "" {
			poolErr = errors.New("DATABASE_URL is not set")
			return
		}
		cfg, err := pgxpool.ParseConfig(url)
		if err != nil {
			poolErr = fmt.Errorf("DATABASE_URL parse: %w", err)
			return
		}
		// Conservative pool — the terminal only fans out a handful of queries
		// per render and most stay open <50 ms over the localhost socket.
		cfg.MaxConns = 4
		cfg.MinConns = 1
		cfg.HealthCheckPeriod = 30 * time.Second

		connectCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		p, err := pgxpool.NewWithConfig(connectCtx, cfg)
		if err != nil {
			poolErr = fmt.Errorf("pgxpool: %w", err)
			return
		}
		pool = p
	})
	if poolErr != nil {
		return nil, poolErr
	}
	return pool, nil
}
