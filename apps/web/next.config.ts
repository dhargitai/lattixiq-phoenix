import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration (now stable in Next.js 15)
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  // Experimental configuration for better stability
  experimental: {
    // Improved memory management
    workerThreads: false,
    cpus: 4,
  },

  // Webpack configuration for file system handling
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Ignore watching .next directory to prevent race conditions
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules", "**/.next", "**/.git"],
        // Poll interval for file watching (helps with file system issues)
        poll: 1000,
        aggregateTimeout: 300,
      };

      // Optimize cache settings
      config.cache = {
        type: "filesystem",
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    return config;
  },

  // Output configuration - removed standalone to fix public directory serving
  // output: "standalone",

  // Disable source maps in development to reduce file system operations
  productionBrowserSourceMaps: false,

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
