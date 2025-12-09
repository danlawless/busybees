import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: undefined, // Disable Turbopack
  },
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

// Sentry configuration for Next.js 15.5.x
// The webpack plugin causes createFilename TypeError with flight-loader
// Disabling it while keeping runtime error tracking
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,

  // CRITICAL: Disable features that cause build conflicts with Next.js 15.5.x
  reactComponentAnnotation: {
    enabled: false,
  },
  automaticVercelMonitors: false,

  // Disable the webpack plugin entirely to avoid flight-loader conflicts
  // Runtime Sentry still works via instrumentation files
  unstable_sentryWebpackPluginOptions: {
    disable: true,
  },

  // These won't work with plugin disabled, but keeping for documentation
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
});
