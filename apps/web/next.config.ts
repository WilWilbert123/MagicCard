import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// Load the monorepo-level .env.local when Next is started from apps/web.
loadEnvConfig(path.resolve(__dirname, '../..'));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@workspace/card-engine'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config) => {
    // Exclude canvas from server-side bundle (used by konva/card-engine)
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};

export default nextConfig;

