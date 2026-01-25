const CACHE_NAME = "insight-v1";
const STATIC_CACHE = "insight-static-v1";
const API_CACHE = "insight-api-v1";

const STATIC_ASSETS = [
  "/",
  "/oracle",
  "/manifest.json",
  "/logo-owl.png",
  "/logo-owl.svg",
];

const API_PATTERNS = [
  /\/api\/oracle\/stats/,
  /\/api\/oracle\/assertions/,
  /\/api\/oracle\/disputes/,
  /\/api\/oracle\/leaderboard/,
];

async function installServiceWorker() {
  const staticCache = await caches.open(STATIC_CACHE);
  await staticCache.addAll(STATIC_ASSETS);
}

async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(
        (name) =>
          name !== CACHE_NAME && name !== STATIC_CACHE && name !== API_CACHE,
      )
      .map((name) => caches.delete(name)),
  );
}

async function fetchWithCache(event) {
  const { request } = event;
  const url = new URL(request.url);

  if (API_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      fetchAndCache(request, API_CACHE);
      return cachedResponse;
    }

    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(API_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "offline" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok && url.protocol === "https:") {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    return new Response("Offline - Resource not cached", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
  } catch {
    // Silent fail for background fetch
  }
}

async function handleMessage(event) {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "CLEAR_CACHE") {
    await cleanupOldCaches();
    event.ports[0].postMessage({ ok: true });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(installServiceWorker());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(cleanupOldCaches());
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetchWithCache(event));
});

self.addEventListener("message", handleMessage);

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-assertions") {
    event.waitUntil(syncPendingAssertions());
  }
});

async function syncPendingAssertions() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: "SYNC_COMPLETE" });
    });
  } catch {
    console.error("Sync failed");
  }
}
