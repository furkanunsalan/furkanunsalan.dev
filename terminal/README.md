# terminal — `ssh furkanunsalan.dev`

Tiny SSH server that exposes the same content as the website (posts,
experiences, tools, projects, bookmarks) through a Bubble Tea TUI. Built with
[Charm Wish](https://github.com/charmbracelet/wish).

## Layout

```
terminal/
├── cmd/server/main.go            # SSH + Bubble Tea bootstrap, dotenv loader
├── internal/tui/                 # views, styles, root model
└── internal/data/
    ├── loaders.go                # ../content/{posts,experiences,tools}
    ├── github.go                 # GitHub repos via REST
    ├── raindrop.go               # Raindrop bookmarks via REST
    └── dotenv.go                 # tiny KEY=value loader (no extra dep)
```

## Local dev

```bash
cd terminal
make tidy        # one-time: resolve deps + write go.sum
make run         # serves on 0.0.0.0:2222 with content from ../content
```

In another shell:

```bash
ssh -p 2222 localhost
```

The first run generates `.ssh/term_ed25519` (gitignored).

## Env vars

The server auto-loads `<CONTENT_ROOT>/.env` on boot, but won't override
anything already in the process env. Production deployments should set these
through systemd (or whatever runs the binary), not via `.env`.

| Name              | Default             | Used for                                         |
| ----------------- | ------------------- | ------------------------------------------------ |
| `HOST`            | `0.0.0.0`           | Bind interface                                   |
| `PORT`            | `2222`              | Bind port                                        |
| `HOST_KEY`        | `.ssh/term_ed25519` | Persistent ed25519 host key path                 |
| `CONTENT_ROOT`    | `.`                 | Path containing the `content/` folder + `.env`   |
| `GITHUB_TOKEN`    | —                   | GitHub repos view (REST). Required for projects. |
| `GITHUB_USERNAME` | `furkanunsalan`     | Override the user being queried                  |
| `RAINDROP_TOKEN`  | —                   | Bookmarks view. Required for bookmarks.          |

If `GITHUB_TOKEN` / `RAINDROP_TOKEN` are missing, the corresponding view
shows the underlying error inline instead of crashing.

## Keybindings

The TUI is mouse-aware and supports both arrow keys and vim-style nav, so
you can use whichever feels natural.

| Action                 | Keys                                             |
| ---------------------- | ------------------------------------------------ |
| Switch section         | `1` `2` `3` `4` `5` `6`                          |
| Move list cursor       | `↑` `↓` `k` `j`                                  |
| Jump list top / bottom | `g` `G` (also `Home` / `End`)                    |
| Open selected post     | `Enter` (also `→` / `l`)                         |
| Scroll page (any view) | `↑` `↓` `PgUp` `PgDn` `Home` `End` + mouse wheel |
| Back from post         | `Esc` or `Backspace`                             |
| Quit                   | `q` or `Ctrl-C`                                  |

## Production deploy on the VPS

1. Cross-compile (CI does this automatically; local fallback below):
   ```bash
   make build-linux       # outputs bin/term-linux
   ```
2. Sync to VPS:
   ```bash
   rsync -az bin/term-linux root@vps:/root/furkanunsalan-term/bin/term
   rsync -az --delete ../content root@vps:/root/furkanunsalan-term/content
   ```
3. Generate a persistent host key once:
   ```bash
   ssh-keygen -t ed25519 -f /root/furkanunsalan-term/.ssh/term_ed25519 -N ''
   ```
4. systemd unit at `/etc/systemd/system/furkanunsalan-term.service`:

   ```ini
   [Unit]
   Description=furkanunsalan.dev SSH terminal
   After=network.target

   [Service]
   WorkingDirectory=/root/furkanunsalan-term
   Environment=PORT=2222
   Environment=CONTENT_ROOT=/root/furkanunsalan-term
   Environment=GITHUB_TOKEN=...
   Environment=RAINDROP_TOKEN=...
   ExecStart=/root/furkanunsalan-term/bin/term
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

   Then `systemctl enable --now furkanunsalan-term`.

5. **To use port 22** (so visitors run plain `ssh furkanunsalan.dev`), move
   admin sshd off 22 first (`sshd_config` → `Port 2222`, restart sshd, update
   your `~/.ssh/config`). Then change the unit's `PORT=22`. Don't lock
   yourself out — keep an active admin session open while you swap.

## Adding a Photos view

Photos render meaningfully in the terminal only via sixel/`chafa`/`kitty`
graphics, which are client-dependent. Easy fallback: render a list of titles

- permalink URLs (same approach as Bookmarks). The fetcher would mirror
  `lib/unsplash.ts` and only need `UNSPLASH_ACCESS_KEY`.
