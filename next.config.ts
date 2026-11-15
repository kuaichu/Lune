import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/.playwright-cli/**',
          '**/output/**',
          '**/.backup/**',
        ],
      }
    }

    return config
  },
}

export default nextConfig
