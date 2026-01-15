import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    reactStrictMode: true,
    output: "standalone",
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    compress: true,
    typedRoutes: true,
    images: {
      formats: ["image/avif", "image/webp"],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
    experimental: {
      optimizeCss: true,
      webpackBuildWorker: true,
      serverMinification: true,
    },
    modularizeImports: {
      "lucide-react": {
        transform: "lucide-react/dist/esm/icons/{{ kebabCase member }}",
        skipDefaultConversion: true,
      },
    },
    webpack: (config) => {
      // Ignore OpenTelemetry dynamic dependency warnings
      config.ignoreWarnings = config.ignoreWarnings || [];
      config.ignoreWarnings.push({
        module:
          /@opentelemetry\/instrumentation\/build\/esm\/platform\/node\/instrumentation\.js/,
        message: /the request of a dependency is an expression/,
      });

      return config;
    },
    async headers() {
      const headers: Array<{ key: string; value: string }> = [
        {
          key: "X-DNS-Prefetch-Control",
          value: "off",
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value:
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()",
        },
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin",
        },
        {
          key: "Cross-Origin-Resource-Policy",
          value: "same-origin",
        },
      ];
      if (!isDev) {
        headers.push({
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        });
      }
      return [
        {
          source: "/:path*",
          headers,
        },
      ];
    },
  };
}
