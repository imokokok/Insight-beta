import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

function buildCsp(isDev: boolean) {
  const mode = (process.env.INSIGHT_CSP_MODE ?? "relaxed").toLowerCase();
  const strict = mode === "strict";

  const scriptSrc = ["'self'"];
  if (!strict || isDev) scriptSrc.push("'unsafe-inline'");
  if (isDev) scriptSrc.push("'unsafe-eval'");

  const styleSrc = ["'self'", "'unsafe-inline'"];

  const connectSrc = ["'self'", "https:", "wss:"];
  if (isDev) connectSrc.push("http:", "ws:");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "script-src-attr 'none'",
    `style-src ${styleSrc.join(" ")}`,
    "img-src 'self' blob: data:",
    "media-src 'self'",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
    directives.push("block-all-mixed-content");
  }

  return directives.join("; ");
}

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
      const csp = buildCsp(isDev);
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
          key: "Content-Security-Policy",
          value: csp,
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
