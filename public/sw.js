/**
 * Service Worker for Oracle Monitor
 *
 * 提供缓存策略和离线支持
 */

/* eslint-disable no-undef */

const CACHE_NAME = 'oracle-monitor-v1';
const STATIC_CACHE = 'oracle-monitor-static-v1';
const API_CACHE = 'oracle-monitor-api-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = ['/', '/manifest.json', '/favicon.ico'];

// 缓存策略
const CACHE_STRATEGIES = {
  // 静态资源 - Cache First
  static: {
    pattern: /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
    strategy: 'cache-first',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
  },
  // API 请求 - Network First with Cache Fallback
  api: {
    pattern: /\/api\//,
    strategy: 'network-first',
    maxAge: 5 * 60 * 1000, // 5分钟
  },
  // 页面 - Stale While Revalidate
  page: {
    pattern: /^(?!.*\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$).*$/,
    strategy: 'stale-while-revalidate',
    maxAge: 24 * 60 * 60 * 1000, // 1天
  },
};

// ============================================================================
// Install Event
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      }),
  );
});

// ============================================================================
// Activate Event
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                name.startsWith('oracle-monitor-') &&
                name !== CACHE_NAME &&
                name !== STATIC_CACHE &&
                name !== API_CACHE
              );
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            }),
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      }),
  );
});

// ============================================================================
// Fetch Event
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过第三方请求
  if (url.origin !== self.location.origin) {
    return;
  }

  // 根据请求类型选择缓存策略
  if (CACHE_STRATEGIES.api.pattern.test(url.pathname)) {
    event.respondWith(handleApiRequest(request));
  } else if (CACHE_STRATEGIES.static.pattern.test(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

// ============================================================================
// Cache Strategies
// ============================================================================

/**
 * 处理 API 请求 - Network First with Cache Fallback
 */
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);

  try {
    // 先尝试网络请求
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // 缓存成功的响应
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    console.log('[SW] Network failed, trying cache:', request.url);

    // 网络失败，尝试缓存
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // 检查缓存是否过期
      const cachedDate = cachedResponse.headers.get('sw-cached-date');
      if (cachedDate) {
        const age = Date.now() - parseInt(cachedDate, 10);
        if (age < CACHE_STRATEGIES.api.maxAge) {
          return cachedResponse;
        }
      }
    }

    // 缓存也没有，返回错误
    return new Response(JSON.stringify({ error: 'Network error and no cache available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 处理静态资源请求 - Cache First
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // 在后台更新缓存
    fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response);
        }
      })
      .catch(() => {
        // 忽略后台更新错误
      });

    return cachedResponse;
  }

  // 缓存未命中，从网络获取
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (err) {
    console.error('[SW] Static fetch failed:', err);
    throw err;
  }
}

/**
 * 处理页面请求 - Stale While Revalidate
 */
async function handlePageRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // 发起网络请求（后台更新）
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        // 添加缓存时间戳
        const headers = new Headers(response.headers);
        headers.set('sw-cached-date', Date.now().toString());

        const responseToCache = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });

        cache.put(request, responseToCache);
      }
      return response;
    })
    .catch((error) => {
      console.log('[SW] Page fetch failed:', error);
      return null;
    });

  // 如果有缓存，先返回缓存，同时后台更新
  if (cachedResponse) {
    // 检查缓存是否过期
    const cachedDate = cachedResponse.headers.get('sw-cached-date');
    if (cachedDate) {
      const age = Date.now() - parseInt(cachedDate, 10);
      if (age < CACHE_STRATEGIES.page.maxAge) {
        return cachedResponse;
      }
    }
  }

  // 等待网络请求
  try {
    const networkResponse = await networkPromise;
    if (networkResponse) {
      return networkResponse;
    }
  } catch {
    console.log('[SW] Network error');
  }

  // 网络失败，返回缓存（即使过期）
  if (cachedResponse) {
    return cachedResponse;
  }

  // 什么都没有，返回离线页面
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Offline</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; }
          h1 { color: #666; }
        </style>
      </head>
      <body>
        <h1>You are offline</h1>
        <p>Please check your internet connection and try again.</p>
      </body>
    </html>
    `,
    {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    },
  );
}

// ============================================================================
// Background Sync
// ============================================================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncAnalytics() {
  // 同步分析数据
  console.log('[SW] Syncing analytics...');
}

// ============================================================================
// Push Notifications
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag,
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notification = event.notification;

  if (action === 'open') {
    event.waitUntil(clients.openWindow(notification.data?.url || '/'));
  }
});

// ============================================================================
// Message Handling
// ============================================================================

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded');
