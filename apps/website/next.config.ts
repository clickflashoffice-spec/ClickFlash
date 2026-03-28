import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",

  // Image optimization settings
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.clickflash.pro",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Performance optimizations
  experimental: {
    optimizeCss: false,
    nextScriptWorkers: false,
  },

  // Disable font optimization if needed (handled via next/font in Next 15)
  // analyze: process.env.ANALYZE === 'true',

  // Webpack configuration for optimization
  webpack: (config, { isServer, nextRuntime }) => {
    // Optimize bundle size
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,
            // Separate Three.js into its own chunk
            three: {
              name: "three",
              test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Separate Framer Motion
            framer: {
              name: "framer",
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              priority: 30,
              enforce: true,
            },
            // Vendor chunk
            vendor: {
              name: "vendor",
              test: /[\\/]node_modules[\\/]/,
              priority: 20,
              enforce: true,
            },
            // Common chunk
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              enforce: true,
            },
          },
        },
      };
    }

    // Ignore certain modules on edge runtime
    if (nextRuntime === "edge") {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          fs: false,
          path: false,
        },
      };
    }

    return config;
  },

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
