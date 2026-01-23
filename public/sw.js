const CACHE_VERSION = "v1";
const CACHE_NAME = `insight-oracle-${CACHE_VERSION}`;

const CACHE_STRATEGIES = {
  CACHE_FIRST: "cache-first",
  NETWORK_FIRST: "network-first",
  STALE_WHILE_REVALIDATE: "stale-while-revalidate",
  NETWORK_ONLY: "network-only",
  CACHE_ONLY: "cache-only",
};

const CACHE_CONFIG = {
  STATIC_ASSETS: {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    patterns: [/\.(?:js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/i],
  },
  API_ROUTES: {
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    maxAge: 5 * 60 * 1000,
    patterns: [/^\/api\//i],
  },
  HTML_PAGES: {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    maxAge: 24 * 60 * 60 * 1000,
    patterns: [/\.html$/i, /^\/$/i],
  },
};

const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([
          "/",
          "/oracle",
          "/disputes",
          "/alerts",
          "/audit",
          "/watchlist",
          "/my-assertions",
          "/my-disputes",
          "/logo-owl.png",
          "/manifest.json",
          OFFLINE_URL,
        ]);
      })
      .catch((error) => {
        console.error("Failed to cache resources during install:", error);
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }),
        );
      })
      .then(() => {
        return self.clients.claim();
      }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  const config = Object.values(CACHE_CONFIG).find((c) =>
    c.patterns.some((pattern) => pattern.test(url.pathname)),
  );

  if (!config) {
    event.respondWith(fetch(request));
    return;
  }

  switch (config.strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      event.respondWith(cacheFirst(request, config.maxAge));
      break;
    case CACHE_STRATEGIES.NETWORK_FIRST:
      event.respondWith(networkFirst(request, config.maxAge));
      break;
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      event.respondWith(staleWhileRevalidate(request, config.maxAge));
      break;
    case CACHE_STRATEGIES.NETWORK_ONLY:
      event.respondWith(networkOnly(request));
      break;
    case CACHE_STRATEGIES.CACHE_ONLY:
      event.respondWith(cacheOnly(request));
      break;
    default:
      event.respondWith(fetch(request));
  }
});

async function cacheFirst(request, maxAge) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached && !isExpired(cached, maxAge)) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    if (cached) {
      return cached;
    }
    return getOfflineResponse();
  }
}

async function networkFirst(request, maxAge) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached && !isExpired(cached, maxAge)) {
      return cached;
    }
    return getOfflineResponse();
  }
}

async function staleWhileRevalidate(request, maxAge) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  if (cached && !isExpired(cached, maxAge)) {
    return cached;
  }

  return networkPromise;
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return getOfflineResponse();
  }
}

async function cacheOnly(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  return cached || getOfflineResponse();
}

function isExpired(response, maxAge) {
  const dateHeader = response.headers.get("Date");
  if (!dateHeader) return false;

  const responseDate = new Date(dateHeader);
  const now = new Date();
  const age = now.getTime() - responseDate.getTime();

  return age > maxAge;
}

function getOfflineResponse() {
  return caches.match(OFFLINE_URL).then((response) => {
    return (
      response ||
      new Response("Offline", {
        status: 503,
        statusText: "Service Unavailable",
        headers: new Headers({ "Content-Type": "text/plain" }),
      })
    );
  });
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.delete(CACHE_NAME).then(() => {
      console.log("Cache cleared:", CACHE_NAME);
    });
  }

  if (event.data && event.data.type === "UPDATE_CACHE") {
    updateCache(event.data.urls);
  }
});

async function updateCache(urls) {
  const cache = await caches.open(CACHE_NAME);
  for (const url of urls) {
    try {
      await cache.add(url);
    } catch (error) {
      console.error("Failed to cache URL:", url, error);
    }
  }
}

self.addEventListener("push", (event) => {
  const data = event.data?.json();
  const options = {
    body: data?.body || "New notification from Insight Oracle Monitor",
    icon: "/logo-owl.png",
    badge: "/logo-owl.png",
    vibrate: [200, 100, 200],
    tag: data?.tag || "default",
    data: {
      url: data?.url || "/",
      ...data,
    },
    requireInteraction: data?.requireInteraction || false,
    silent: data?.silent || false,
  };

  event.waitUntil(
    self.registration.showNotification(
      data?.title || "Insight Oracle",
      options,
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }

        if (clientList.length > 0) {
          return clientList[0].focus();
        }

        return self.clients.openWindow(urlToOpen);
      }),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(
      syncData().catch((error) => {
        console.error("Background sync failed:", error);
      }),
    );
  }
});

async function syncData() {
  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      console.log("Background sync successful");
    }
  } catch (error) {
    console.error("Background sync error:", error);
  }
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "periodic-sync") {
    event.waitUntil(
      syncData().catch((error) => {
        console.error("Periodic sync failed:", error);
      }),
    );
  }
});
