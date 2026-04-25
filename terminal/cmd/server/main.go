package main

import (
	"context"
	"errors"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/log"
	"github.com/charmbracelet/ssh"
	"github.com/charmbracelet/wish"
	"github.com/charmbracelet/wish/activeterm"
	bm "github.com/charmbracelet/wish/bubbletea"
	"github.com/charmbracelet/wish/logging"

	"github.com/furkanunsalan/furkanunsalan.dev/terminal/internal/data"
	"github.com/furkanunsalan/furkanunsalan.dev/terminal/internal/tui"
)

func main() {
	// Best-effort: load env from project root. Real deployments set env directly.
	root := getenv("CONTENT_ROOT", ".")
	_ = data.LoadDotenv(root + "/.env")

	host := getenv("HOST", "0.0.0.0")
	port := getenv("PORT", "2222")
	hostKey := getenv("HOST_KEY", ".ssh/term_ed25519")

	s, err := wish.NewServer(
		wish.WithAddress(net.JoinHostPort(host, port)),
		wish.WithHostKeyPath(hostKey),
		wish.WithMiddleware(
			bm.Middleware(handler),
			activeterm.Middleware(),
			logging.Middleware(),
		),
	)
	if err != nil {
		log.Error("could not start server", "error", err)
		os.Exit(1)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	log.Info("starting ssh server", "host", host, "port", port)
	go func() {
		if err = s.ListenAndServe(); err != nil && !errors.Is(err, ssh.ErrServerClosed) && !errors.Is(err, http.ErrServerClosed) {
			log.Error("could not start server", "error", err)
			cancel()
		}
	}()

	<-ctx.Done()
	log.Info("stopping ssh server")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()
	if err := s.Shutdown(shutdownCtx); err != nil && !errors.Is(err, ssh.ErrServerClosed) {
		log.Error("could not stop server", "error", err)
	}
}

func handler(_ ssh.Session) (tea.Model, []tea.ProgramOption) {
	return tui.New(), []tea.ProgramOption{
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
