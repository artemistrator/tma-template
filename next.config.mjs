/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    // Directus SDK requires schema generics for strict typing; we use runtime types instead.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Stabilize hot reload in Docker (macOS volume mounts trigger spurious events).
      // poll: 1000 — check for changes every second instead of relying on inotify/FSEvents
      // aggregateTimeout — debounce: wait 300ms after last change before recompiling
      // ignored — never watch .next (Next.js writes there during compilation → endless loop)
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.next/**', '**/.git/**'],
      };
    }
    return config;
  },
};

export default nextConfig;
