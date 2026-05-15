import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint config is handled via eslint.config.mjs
    // Set to false to ensure ESLint runs during builds (default behavior)
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Type errors are checked locally; keep builds from failing on strict checks
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
