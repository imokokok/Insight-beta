/**
 * Workbox Configuration
 *
 * 用于生成 Service Worker 的 Workbox 配置
 */

module.exports = {
  globDirectory: 'public/',
  globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,ico,woff,woff2,ttf,eot,json}'],
  swDest: 'public/sw.js',
  swSrc: 'src/sw-template.js',

  // 缓存策略
  runtimeCaching: [
    {
      // 静态资源 - Cache First
      urlPattern: /\.(?:js|css|woff2?|ttf|eot)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // 图片资源 - Cache First with expiration
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // API 请求 - Network First
      urlPattern: /\/api\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // Next.js 静态文件 - Stale While Revalidate
      urlPattern: /\/_next\/static\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // 页面导航 - Network First
      urlPattern: /^\/$|^\/\w+$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],

  // 预缓存清单
  globIgnores: ['**/node_modules/**/*', '**/*.map', '**/*.txt'],

  // 跳过等待
  skipWaiting: true,
  clientsClaim: true,

  // 清理过期缓存
  cleanupOutdatedCaches: true,

  // 离线页面
  navigateFallback: '/offline.html',
  navigateFallbackDenylist: [/\/api\//, /\/_next\//, /\/static\//],

  // 源映射
  sourcemap: true,

  // 模式
  mode: 'production',
};
