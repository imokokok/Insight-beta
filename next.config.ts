import { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  compress: true,
  distDir: isDev ? ".next-dev" : ".next",
  experimental: {
    optimizeCss: true,
    serverMinification: true,
    webpackBuildWorker: true,
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
        headers,
        source: "/:path*",
      },
    ];
  },
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    formats: ["image/avif", "image/webp"],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  modularizeImports: {
    "lucide-react": {
      skipDefaultConversion: true,
      transform: "lucide-react/dist/esm/icons/{{ kebabCase member }}",
    },
  },
  output: "standalone",
  reactStrictMode: true,
  typedRoutes: true,
  webpack: (config) => {
    config.ignoreWarnings = config.ignoreWarnings || [];
    config.ignoreWarnings.push({
      message: /the request of a dependency is an expression/,
      module:
        /@opentelemetry\/instrumentation\/build\/esm\/platform\/node\/instrumentation\.js/,
    });

    return config;
  },
};

const sentryWebpackPluginOptions = {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
