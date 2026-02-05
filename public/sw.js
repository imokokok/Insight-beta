/**
 * Service Worker for Insight Beta
 *
 * 提供离线缓存、资源预加载和性能优化
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
const CACHE_NAME = 'insight-beta-v1';
const STATIC_CACHE = 'insight-static-v1';
const DYNAMIC_CACHE = 'insight-dynamic-v1';
const IMAGE_CACHE = 'insight-images-v1';

// 预缓存的关键资源
const PRECACHE_URLS = [
  '/',
  '/oracle',
  '/oracle/dashboard',
  '/_next/static/css/_app.css',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/framework.js',
  '/_next/static/chunks/pages/_app.js',
];

// 安装时预缓存关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('[SW] Pre-cache failed:', err);
      }),
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                name.startsWith('insight-') &&
                name !== STATIC_CACHE &&
                name !== DYNAMIC_CACHE &&
                name !== IMAGE_CACHE
              );
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// 拦截请求并提供缓存
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过 chrome-extension 和 other 协议
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API 请求 - 网络优先，失败时返回缓存
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 图片资源 - 缓存优先
  if (request.destination === 'image') {
    event.respondWith(imageCache(request));
    return;
  }

  // Next.js 静态资源 - 缓存优先
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 字体资源 - 缓存优先
  if (request.destination === 'font') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 页面导航 - 网络优先
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // 其他资源 - 缓存优先
  event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
});

// 缓存优先策略
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // 后台更新缓存
    fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      })
      .catch(() => {});
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return new Response('Network error', { status: 408 });
  }
}

// 网络优先策略
async function networkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response('Network error', { status: 408 });
  }
}

// 图片缓存策略
async function imageCache(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // 限制图片缓存数量
      const keys = await cache.keys();
      if (keys.length > 100) {
        await cache.delete(keys[0]);
      }
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Image cache failed:', error);
    return new Response('Image load failed', { status: 408 });
  }
}

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Background sync executed');
  // 可以在这里执行后台数据同步
}

// 推送通知
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: data.data,
      actions: data.actions || [],
    }),
  );
});

// 通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    // eslint-disable-next-line no-undef
    clients.openWindow(event.notification.data?.url || '/'),
  );
});

// 消息处理
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
