import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    AIRPORTDB_API_KEY: process.env.AIRPORTDB_API_KEY,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    // Only in development - minimal CSP to fix eval error
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: "script-src 'self' 'unsafe-eval' 'unsafe-inline';"
            }
          ]
        }
      ]
    }
    return []
  }
};

export default nextConfig;