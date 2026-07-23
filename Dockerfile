# syntax=docker/dockerfile:1

# ---- builder: full toolchain, builds the Astro standalone server ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Native deps (sharp/argon2) need their build prereqs available for npm ci to
# fetch/verify the linux-x64 prebuilds. bookworm (glibc) matches the distroless
# runtime below, so the compiled binaries are ABI-compatible.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# astro build never queries the DB (SSR renders at request time), but a few
# modules assert these at load — placeholders only, never baked into the bundle.
ENV ADMIN_SESSION_SECRET="docker-build-placeholder-not-used-at-runtime-____"
ENV DATABASE_URL="postgres://build:placeholder@127.0.0.1:5432/build"

# No `npm prune --omit=dev`: Astro's standalone SSR output imports a handful of
# packages that npm classifies as (transitive) dev deps — e.g. es-module-lexer —
# so pruning them breaks `node dist/server/entry.mjs` at runtime. Keeping the
# full tree costs image size but guarantees every referenced module resolves.
RUN npm run build

# ---- runtime: distroless, no shell / no package manager, just node + app ----
FROM gcr.io/distroless/nodejs22-debian12 AS runner
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000

# Only what the standalone server needs at runtime.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public

EXPOSE 3000

# distroless nodejs entrypoint is `node`, so this runs: node dist/server/entry.mjs
CMD ["dist/server/entry.mjs"]
