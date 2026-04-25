// During `next build`, Keystatic validates its GitHub-storage config at module
// evaluation (page-data collection). If the OAuth env vars aren't set (first
// deploy before secrets are in place), the build fails. Seed placeholders
// during the production build phase ONLY — never during `next dev` or
// runtime, otherwise Keystatic would use them as a real client_id and break
// the OAuth flow.
if (process.env.NEXT_PHASE === "phase-production-build") {
  for (const k of [
    "KEYSTATIC_GITHUB_CLIENT_ID",
    "KEYSTATIC_GITHUB_CLIENT_SECRET",
    "KEYSTATIC_SECRET",
  ]) {
    if (!process.env[k]) process.env[k] = "build-placeholder";
  }
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
