.PHONY: tidy run build

BIN ?= bin/term
MAIN = ./cmd/server
CONTENT_ROOT ?= ..

tidy:
	go mod tidy

run:
	CONTENT_ROOT=$(CONTENT_ROOT) go run $(MAIN)

build:
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o $(BIN) $(MAIN)

# Cross-compile for the VPS (linux/amd64).
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o $(BIN)-linux $(MAIN)
