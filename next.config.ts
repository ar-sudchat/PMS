import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    allowedDevOrigins: [
    'http://localhost:3000',
    'http://10.8.8.88:3000'
  ],
  output: 'standalone',
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
