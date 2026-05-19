import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle so the Docker image
  // can run with just `node server.js` (no node_modules copy needed).
  output: 'standalone',
  // Pin the workspace root to THIS project so the standalone output is
  // produced at .next/standalone/server.js (and not .next/standalone/<dir>/...).
  // Without this, Next picks /Users/artit because a stray package-lock.json
  // exists one level up — which breaks the Docker image layout.
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
