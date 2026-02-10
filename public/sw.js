/**
 * Service Worker for Oracle Monitor
 *
 * 提供缓存策略和离线支持
 */

/* eslint-disable no-undef */

const CACHE_NAME = 'oracle-monitor-v2';
const STATIC_CACHE = 'oracle-monitor-static-v2';
const API_CACHE = 'oracle-monitor-api-v2';
const IMAGE_CACHE = 'oracle-monitor-images-v2';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/logo-owl.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// 缓存策略
const CACHE_STRATEGIES = {
  // 静态资源 - Cache First
  static: {
    pattern: /\.(js|css|woff|woff2|ttf|eot)$/,
    strategy: 'cache-first',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
  },
  // 图片资源 - Cache First with LRU
  images: {
    pattern: /\.(png|jpg|jpeg|gif|svg|webp|avif)$/,
    strategy: 'cache-first',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    maxEntries: 100, // 最多缓存100张图片
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
                name !== API_CACHE &&
                name !== IMAGE_CACHE
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

  // 跳过第三方请求（但允许图片 CDN）
  if (url.origin !== self.location.origin && !isImageCDN(url)) {
    return;
  }

  // 根据请求类型选择缓存策略
  if (CACHE_STRATEGIES.api.pattern.test(url.pathname)) {
    event.respondWith(handleApiRequest(request));
  } else if (CACHE_STRATEGIES.images.pattern.test(url.pathname)) {
    event.respondWith(handleImageRequest(request));
  } else if (CACHE_STRATEGIES.static.pattern.test(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

/**
 * 检查是否是图片 CDN
 */
function isImageCDN(url) {
  const imageCDNs = ['cdn.jsdelivr.net', 'raw.githubusercontent.com'];
  return imageCDNs.some((cdn) => url.hostname.includes(cdn));
}

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
      // 克隆响应并添加时间戳
      const clonedResponse = networkResponse.clone();
      const headers = new Headers(clonedResponse.headers);
      headers.set('sw-cached-date', Date.now().toString());

      const responseToCache = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers,
      });

      cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    // 网络失败，尝试缓存
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // 检查缓存是否过期
      const cachedDate = cachedResponse.headers.get('sw-cached-date');
      if (cachedDate) {
        const age = Date.now() - parseInt(cachedDate, 10);
        if (age < CACHE_STRATEGIES.api.maxAge) {
          // 返回缓存但标记为离线模式
          const headers = new Headers(cachedResponse.headers);
          headers.set('X-SW-Offline', 'true');

          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers,
          });
        }
      }
    }

    // 缓存也没有，返回离线错误
    return createOfflineResponse('api');
  }
}

/**
 * 处理图片请求 - Cache First with LRU
 */
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // 检查缓存是否过期
    const cachedDate = cachedResponse.headers.get('sw-cached-date');
    if (cachedDate) {
      const age = Date.now() - parseInt(cachedDate, 10);
      if (age < CACHE_STRATEGIES.images.maxAge) {
        // 在后台更新缓存
        fetchAndCacheImage(request, cache);
        return cachedResponse;
      }
    }
  }

  // 缓存未命中或过期，从网络获取
  try {
    return await fetchAndCacheImage(request, cache);
  } catch (error) {
    console.log('[SW] Image fetch failed, trying cache:', request.url);

    // 网络失败，返回过期缓存
    if (cachedResponse) {
      return cachedResponse;
    }

    // 什么都没有，返回离线图片
    return createOfflineResponse('image');
  }
}

/**
 * 获取并缓存图片
 */
async function fetchAndCacheImage(request, cache) {
  const networkResponse = await fetch(request);

  if (networkResponse.ok) {
    // 克隆响应并添加时间戳
    const clonedResponse = networkResponse.clone();
    const headers = new Headers(clonedResponse.headers);
    headers.set('sw-cached-date', Date.now().toString());

    const responseToCache = new Response(clonedResponse.body, {
      status: clonedResponse.status,
      statusText: clonedResponse.statusText,
      headers,
    });

    // 检查缓存数量，执行 LRU 淘汰
    await enforceLRUCache(cache, CACHE_STRATEGIES.images.maxEntries);

    cache.put(request, responseToCache);
  }

  return networkResponse;
}

/**
 * 执行 LRU 缓存淘汰
 */
async function enforceLRUCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length < maxEntries) {
    return;
  }

  // 获取所有缓存项的元数据
  const entries = await Promise.all(
    keys.map(async (key) => {
      const response = await cache.match(key);
      const date = response?.headers.get('sw-cached-date');
      return { key, date: date ? parseInt(date, 10) : 0 };
    }),
  );

  // 按时间排序，删除最旧的
  entries.sort((a, b) => a.date - b.date);
  const toDelete = entries.slice(0, entries.length - maxEntries + 1);

  await Promise.all(toDelete.map((entry) => cache.delete(entry.key)));
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
  return createOfflineResponse('page');
}

/**
 * 创建离线响应
 */
function createOfflineResponse(type) {
  if (type === 'api') {
    return new Response(
      JSON.stringify({
        error: 'You are offline',
        message: 'Please check your internet connection and try again.',
        offline: true,
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-SW-Offline': 'true',
        },
      },
    );
  }

  if (type === 'image') {
    // 返回 1x1 透明像素
    const transparentPixel =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    return fetch(transparentPixel);
  }

  // 离线页面
  return new Response(
    `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - Oracle Monitor</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            text-align: center;
            max-width: 400px;
          }
          .icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 24px;
            background: #ddd6fe;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
          }
          h1 {
            color: #4c1d95;
            font-size: 24px;
            margin-bottom: 12px;
          }
          p {
            color: #6b7280;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: #7c3aed;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: background 0.2s;
          }
          .button:hover {
            background: #6d28d9;
          }
          .cached-notice {
            margin-top: 16px;
            padding: 12px;
            background: #fef3c7;
            border-radius: 8px;
            color: #92400e;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📡</div>
          <h1>You're Offline</h1>
          <p>It looks like you've lost your internet connection. Please check your network settings and try again.</p>
          <a href="/" class="button">Try Again</a>
          <div class="cached-notice">
            Some content may be available from cache while offline.
          </div>
        </div>
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
  } else if (event.tag === 'sync-failed-requests') {
    event.waitUntil(syncFailedRequests());
  }
});

async function syncAnalytics() {
  console.log('[SW] Syncing analytics...');
}

async function syncFailedRequests() {
  console.log('[SW] Syncing failed requests...');
  // 可以从 IndexedDB 中读取失败的请求并重试
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
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notification = event.notification;

  if (action === 'open' || !action) {
    const url = notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        // 如果已有窗口打开，聚焦它
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // 否则打开新窗口
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      }),
    );
  }
});

// ============================================================================
// Message Handling
// ============================================================================

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  } else if (event.data?.type === 'GET_CACHE_STATUS') {
    event.waitUntil(sendCacheStatus(event.source));
  } else if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
});

/**
 * 发送缓存状态
 */
async function sendCacheStatus(client) {
  const cacheNames = await caches.keys();
  const status = {};

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    status[name] = keys.length;
  }

  client.postMessage({
    type: 'CACHE_STATUS',
    status,
  });
}

/**
 * 清除所有缓存
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

console.log('[SW] Service Worker loaded');
