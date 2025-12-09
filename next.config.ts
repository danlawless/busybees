import type { NextConfig } from "next";

/**
 * Next.js Configuration
 *
 * IMPORTANT: We do NOT use withSentryConfig wrapper here.
 *
 * The Sentry webpack plugin (used by withSentryConfig) conflicts with
 * Next.js 15.5.x's next-flight-loader, causing:
 *   TypeError: Cannot read properties of undefined (reading 'createFilename')
 *
 * This happens because withSentryConfig modifies webpack's compilation context
 * in a way that breaks ModuleFilenameHelpers access during RSC processing.
 *
 * Sentry still works via instrumentation files:
 * - instrumentation.ts (server/edge initialization)
 * - instrumentation-client.ts (client initialization)
 * - sentry.server.config.ts (server runtime config)
 * - sentry.edge.config.ts (edge runtime config)
 *
 * Source map uploading can be done via Sentry CLI in CI/CD if needed.
 */
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/editor',
        destination: '/editor/index.html',
      },
      {
        source: '/editor/',
        destination: '/editor/index.html',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/editor/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
