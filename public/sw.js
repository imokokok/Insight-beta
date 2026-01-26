/// <reference lib="webworker" />

const CACHE_NAME = 'insight-cache-v1';
const STATIC_CACHE = 'insight-static-v1';
const DYNAMIC_CACHE = 'insight-dynamic-v1';
const API_CACHE = 'insight-api-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
];

const CACHE_STRATEGIES = {
  static: 'cache-first',
  api: 'network-first',
  dynamic: 'stale-while-revalidate',
};

const CACHE_EXPIRATION = {
  maxEntries: 100,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  apiMaxAge: 5 * 60 * 1000,
};

interface CacheRequest {
  url: string;
  method: string;
  body?: string;
}

interface CachedResponse {
  response: Response;
  timestamp: number;
  url: string;
}

declare const self: ServiceWorkerGlobalScope;

class ServiceWorkerManager {
  private pendingRequests: Map<string, (data: unknown) => void> = new Map();
  private syncQueue: Array<CacheRequest> = [];
  private backgroundSyncRegistered = false;

  constructor() {
    self.addEventListener('install', (event) => this.handleInstall(event));
    self.addEventListener('activate', (event) => this.handleActivate(event));
    self.addEventListener('fetch', (event) => this.handleFetch(event));
    self.addEventListener('push', (event) => this.handlePush(event));
    self.addEventListener('sync', (event) => this.handleSync(event));
    self.addEventListener('notificationclick', (event) => this.handleNotificationClick(event));
    self.addEventListener('notificationclose', (event) => this.handleNotificationClose(event));
    self.addEventListener('message', (event) => this.handleMessage(event));
  }

  private async handleInstall(event: ExtendableEvent): Promise<void> {
    console.log('[SW] Installing Service Worker...');

    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(STATIC_ASSETS);

    await self.skipWaiting();
    console.log('[SW] Service Worker installed');
  }

  private async handleActivate(event: ExtendableEvent): Promise<void> {
    console.log('[SW] Activating Service Worker...');

    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith('insight-'))
        .map((name) => {
          if (name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE) {
            return caches.delete(name);
          }
        })
    );

    await self.clients.claim();
    console.log('[SW] Service Worker activated');
  }

  private async handleFetch(event: FetchEvent): Promise<void> {
    const { request } = event;
    const url = new URL(request.url);

    if (url.origin !== location.origin) {
      return;
    }

    if (request.method !== 'GET') {
      event.respondWith(this.handleNonGetRequest(request));
      return;
    }

    const path = url.pathname;

    if (this.isStaticAsset(path)) {
      event.respondWith(this.handleStaticRequest(request));
      return;
    }

    if (this.isApiRequest(path)) {
      event.respondWith(this.handleApiRequest(request));
      return;
    }

    event.respondWith(this.handleDynamicRequest(request));
  }

  private isStaticAsset(path: string): boolean {
    return (
      path.startsWith('/_next/static/') ||
      path.startsWith('/images/') ||
      path.startsWith('/fonts/') ||
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.svg') ||
      path.endsWith('.ico')
    );
  }

  private isApiRequest(path: string): boolean {
    return path.startsWith('/api/') || path.startsWith('/api/');
  }

  private async handleStaticRequest(request: Request): Promise<Response> {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      return new Response('Offline', { status: 503 });
    }
  }

  private async handleApiRequest(request: Request): Promise<Response> {
    const cache = await caches.open(API_CACHE);

    try {
      const response = await fetch(request, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (response.ok) {
        const cacheKey = `${request.url}?t=${Date.now()}`;
        const cachedResponse = new Response(response.clone().body, {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers({
            ...Object.fromEntries(response.headers.entries()),
            'X-Cache-Time': String(Date.now()),
          }),
        });
        await cache.put(cacheKey, cachedResponse);
      }

      return response;
    } catch {
      const cacheKey = `${request.url}?t=${Date.now()}`;
      const cachedResponse = await cache.match(cacheKey);

      if (cachedResponse) {
        const cacheTime = parseInt(cachedResponse.headers.get('X-Cache-Time') || '0');
        if (Date.now() - cacheTime < CACHE_EXPIRATION.apiMaxAge) {
          const body = await cachedResponse.clone().text();
          return new Response(body, {
            status: 200,
            headers: {
              'X-Source': 'cache',
              'X-Cache-Age': String(Date.now() - cacheTime),
            },
          });
        }
      }

      return new Response(
        JSON.stringify({ error: 'Network unavailable', cached: false }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  private async handleDynamicRequest(request: Request): Promise<Response> {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    const networkFetch = async (): Promise<Response> => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        return cachedResponse || new Response('Offline', { status: 503 });
      }
    };

    if (cachedResponse) {
      const age = Date.now() - parseInt(cachedResponse.headers.get('X-Cache-Time') || '0');

      if (age < 5 * 60 * 1000) {
        networkFetch();
        return cachedResponse;
      }
    }

    return networkFetch();
  }

  private async handleNonGetRequest(request: Request): Promise<Response> {
    try {
      const response = await fetch(request);

      if (response.ok) {
        return response;
      }

      const body = await request.clone().text();
      await this.queueRequest({
        url: request.url,
        method: request.method,
        body,
      });

      return new Response(JSON.stringify({ queued: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      const body = await request.clone().text();
      await this.queueRequest({
        url: request.url,
        method: request.method,
        body,
      });

      return new Response(JSON.stringify({ queued: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async queueRequest(request: CacheRequest): Promise<void> {
    this.syncQueue.push(request);

    if (!this.backgroundSyncRegistered && 'sync' in self.registration) {
      try {
        await (self.registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('insight-sync');
        this.backgroundSyncRegistered = true;
      } catch (error) {
        console.error('[SW] Background sync registration failed:', error);
      }
    }

    const data = await caches.open('insight-sync-queue');
    await data.put(
      new Request(`/sync-queue/${Date.now()}`),
      new Response(JSON.stringify(request), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }

  private async handlePush(event: PushEvent): Promise<void> {
    console.log('[SW] Push received');

    let data = { title: 'Insight', body: 'New notification', icon: '/icon-192.png', data: {} };

    if (event.data) {
      try {
        data = { ...data, ...event.data.json() };
      } catch {
        data.body = event.data.text();
      }
    }

    const options: NotificationOptions = {
      body: data.body,
      icon: data.icon,
      badge: '/icon-192.png',
      tag: data.tag || 'insight-notification',
      data: data.data,
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
    };

    await event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }

  private async handleSync(event: SyncEvent): Promise<void> {
    console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === 'insight-sync') {
      await event.waitUntil(this.processSyncQueue());
    }
  }

  private async processSyncQueue(): Promise<void> {
    const queue = await caches.open('insight-sync-queue');
    const requests = await queue.keys();

    for (const request of requests) {
      try {
        const response = await queue.match(request);
        const data: CacheRequest = await response.json();

        await fetch(data.url, {
          method: data.method,
          body: data.body,
          headers: { 'Content-Type': 'application/json' },
        });

        await queue.delete(request);
        console.log('[SW] Synced request:', data.url);
      } catch (error) {
        console.error('[SW] Sync failed for request:', request, error);
      }
    }
  }

  private async handleNotificationClick(event: NotificationEvent): Promise<void> {
    console.log('[SW] Notification clicked:', event.action);

    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of clients) {
      if (client.url === urlToOpen && 'focus' in client) {
        await client.focus();
        return;
      }
    }

    if (self.clients.openWindow) {
      await self.clients.openWindow(urlToOpen);
    }
  }

  private async handleNotificationClose(event: NotificationEvent): Promise<void> {
    console.log('[SW] Notification closed:', event.notification.tag);
  }

  private async handleMessage(event: ExtendableMessageEvent): Promise<void> {
    const { data } = event;

    if (data.type === 'SKIP_WAITING') {
      await self.skipWaiting();
    }

    if (data.type === 'CACHE_URLS') {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.addAll(data.urls);
    }

    if (data.type === 'CLEAR_CACHE') {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    if (data.type === 'GET_CACHE_SIZE') {
      let totalSize = 0;
      const cacheNames = await caches.keys();

      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();

        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.clone().blob();
            totalSize += blob.size;
          }
        }
      }

      event.ports[0].postMessage({ size: totalSize });
    }

    if (data.type === 'SYNC_NOW') {
      await this.processSyncQueue();
    }
  }
}

const swManager = new ServiceWorkerManager();
