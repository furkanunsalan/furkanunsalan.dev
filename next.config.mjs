// Keystatic validates its GitHub-storage config at module evaluation, which
// happens during `next build`'s page-data collection. If the OAuth env vars
// aren't set (local builds, first deploy before secrets are in place), the
// build fails. Provide harmless placeholders so validation passes; the real
// values from the runtime env (systemd / pm2) take precedence at request time.
for (const k of [
  "KEYSTATIC_GITHUB_CLIENT_ID",
  "KEYSTATIC_GITHUB_CLIENT_SECRET",
  "KEYSTATIC_SECRET",
]) {
  if (!process.env[k]) process.env[k] = "build-placeholder";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
