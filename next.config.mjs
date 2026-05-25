/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    // argon2 uses node-gyp-build to dynamic-require its `.node` binary out of
    // a per-platform `prebuilds/` folder. Next's standalone tracer doesn't
    // follow that dynamic require, so the prebuilds are dropped from the
    // bundle and `verify()` throws at runtime. Pin them explicitly to the
    // routes that import argon2.
    outputFileTracingIncludes: {
      "/api/admin/login": [
        "./node_modules/argon2/prebuilds/**",
        "./node_modules/argon2/argon2.cjs",
        "./node_modules/argon2/package.json",
      ],
    },
  },
  images: {
    // Disable the Next image optimizer entirely. The /_next/image endpoint
    // is what makes wildcard `remotePatterns` an open HTTPS proxy / SSRF
    // surface — by turning the optimizer off, <Image> renders the source
    // URL directly from the browser. No server-side fetch, no host
    // allowlist to maintain (Karakeep bookmarks would pull cover images
    // from arbitrary URLs and break against any explicit list anyway).
    //
    // Trade-off: lose server-side resize/format conversion. Acceptable for
    // a low-traffic personal site.
    unoptimized: true,
  },
};

export default nextConfig;
