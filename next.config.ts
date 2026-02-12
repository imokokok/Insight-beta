import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

import type { NextConfig } from 'next';

function buildCsp(isDev: boolean) {
  const mode = (process.env.INSIGHT_CSP_MODE ?? 'relaxed').toLowerCase();
  const strict = mode === 'strict';

  const scriptSrc = ["'self'"];
  if (!strict || isDev) scriptSrc.push("'unsafe-inline'");
  if (isDev) scriptSrc.push("'unsafe-eval'");

  const styleSrc = ["'self'", "'unsafe-inline'"];

  const connectSrc = ["'self'", 'https:', 'wss:'];
  if (isDev) connectSrc.push('http:', 'ws:');

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "script-src-attr 'none'",
    `style-src ${styleSrc.join(' ')}`,
    "img-src 'self' blob: data: https:",
    "media-src 'self'",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(' ')}`,
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (!isDev) {
    directives.push('upgrade-insecure-requests');
    directives.push('block-all-mixed-content');
  }

  return directives.join('; ');
}

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  compress: true,
  distDir: isDev ? '.next-dev' : '.next',
  experimental: {
    optimizeCss: true,
    serverMinification: true,
    webpackBuildWorker: true,
    scrollRestoration: true,
    serverActions: {
      bodySizeLimit: '2mb',
    },
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      'viem',
      'react-virtuoso',
      'sonner',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
    ],
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // 优化客户端路由
    clientRouterFilter: true,
    clientRouterFilterRedirects: true,
  },

  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  generateEtags: true,

  // CDN Configuration
  assetPrefix: process.env.CDN_URL || undefined,

  // Image optimization with CDN
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    formats: ['image/avif', 'image/webp'],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox",
    remotePatterns: [
      // 只允许特定域名的图片，提高安全性
      {
        protocol: 'https',
        hostname: '**.vercel.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      // 允许项目特定的 CDN 域名
      ...(process.env.CDN_IMAGE_URL
        ? [
            {
              protocol: 'https' as const,
              hostname: new URL(process.env.CDN_IMAGE_URL).hostname,
              port: '',
              pathname: '/**' as const,
            },
          ]
        : []),
    ],
    // Use CDN for images if configured
    path: process.env.CDN_IMAGE_URL || '/_next/image',
  },

  // Headers for CDN caching
  async headers() {
    const csp = buildCsp(isDev);
    const headers: Array<{ key: string; value: string }> = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value:
          'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()',
      },
      {
        key: 'Content-Security-Policy',
        value: csp,
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
      {
        key: 'Cross-Origin-Resource-Policy',
        value: 'same-origin',
      },
    ];

    if (!isDev) {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    return [
      {
        headers,
        source: '/:path*',
      },
      // CDN Cache headers for static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache headers for images
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{ kebabCase member }}',
    },
    'date-fns': {
      transform: 'date-fns/{{ member }}',
    },
  },

  reactStrictMode: true,
  typedRoutes: true,

  // Disable Turbopack and use webpack
  turbopack: {},

  webpack: (config, { isServer, dev }) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      zlib: false,
      crypto: false,
      http: false,
      https: false,
      net: false,
      tls: false,
      fs: false,
      path: false,
      http2: false,
      stream: false,
      util: false,
      url: false,
      os: false,
      events: false,
      buffer: false,
      string_decoder: false,
      process: false,
    };

    // 添加 alias 避免重复模块
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    // Tree-shaking 和代码分割优化
    if (!isServer && !dev) {
      config.optimization = config.optimization || {};

      // Tree Shaking: 启用 usedExports 和 sideEffects
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // 启用模块合并优化
      config.optimization.mergeDuplicateChunks = true;
      config.optimization.removeAvailableModules = true;
      config.optimization.removeEmptyChunks = true;

      // 代码分割配置
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000, // 20KB
        maxSize: 244000, // 244KB (接近 Gzip 压缩后的 250KB 限制)
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        automaticNameDelimiter: '~',
        cacheGroups: {
          // 框架核心库
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
          // UI 组件库
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 35,
          },
          // 大型第三方库单独打包
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'recharts',
            chunks: 'async',
            priority: 30,
            reuseExistingChunk: true,
          },
          viem: {
            test: /[\\/]node_modules[\\/]viem[\\/]/,
            name: 'viem',
            chunks: 'async',
            priority: 30,
            reuseExistingChunk: true,
          },
          // 工具库
          utils: {
            test: /[\\/]node_modules[\\/](date-fns|ramda)[\\/]/,
            name: 'utils',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
          },
          // 图标库
          icons: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'icons',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
          },
          // 其他 node_modules
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
          // 公共代码提取
          commons: {
            name: 'commons',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };

      // 运行时优化
      config.optimization.runtimeChunk = {
        name: 'runtime',
      };

      // 模块顺序优化
      config.optimization.moduleIds = 'deterministic';
      config.optimization.chunkIds = 'deterministic';
    }

    return config;
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
};

// Bundle Analyzer 配置
const bundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
});

export default bundleAnalyzerConfig(withSentryConfig(nextConfig, sentryWebpackPluginOptions));
