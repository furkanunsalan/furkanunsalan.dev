# syntax=docker/dockerfile:1

# ---- builder: compile the static Go binary ----
FROM golang:1.25-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# CGO-free (pgx + charm are pure Go), so the binary runs on distroless/static.
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags="-s -w" -o /term ./cmd/server

# ---- runtime: distroless static, just the binary ----
FROM gcr.io/distroless/static-debian12
COPY --from=build /term /term
# HOST_KEY points at a mounted volume so the SSH host identity is stable across
# rebuilds (no "host key changed" warnings for returning visitors).
ENV HOST=0.0.0.0 PORT=2222 HOST_KEY=/hostkey/term_ed25519
EXPOSE 2222
ENTRYPOINT ["/term"]
