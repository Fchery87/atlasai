/**
 * BoltForge Service Worker
 * Provides offline capabilities and caching for PWA
 */

const CACHE_NAME = "boltforge-v1";
const RUNTIME_CACHE = "boltforge-runtime-v1";

// Assets to cache on install
const PRECACHE_ASSETS = ["/", "/index.html", "/manifest.json"];

// Install event - cache essential assets
self.addEventListener("install", (event) => {
  console.log("[SW] Install event");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Precaching assets");
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate event");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API calls to LLM providers
  if (
    url.pathname.includes("/api/") ||
    url.hostname.includes("anthropic") ||
    url.hostname.includes("openai") ||
    url.hostname.includes("groq")
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        // Update cache in background for non-precached assets
        if (!PRECACHE_ASSETS.includes(url.pathname)) {
          fetch(request)
            .then((response) => {
              if (response.ok) {
                return caches.open(RUNTIME_CACHE).then((cache) => {
                  cache.put(request, response.clone());
                  return response;
                });
              }
            })
            .catch(() => {
              // Network error, ignore
            });
        }
        return cachedResponse;
      }

      // Fetch from network
      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            return caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
          }
          return response;
        })
        .catch((error) => {
          console.error("[SW] Fetch failed:", error);

          // Return offline page for navigation requests
          if (request.mode === "navigate") {
            return caches.match("/").then((response) => {
              return (
                response ||
                new Response("Offline", {
                  status: 503,
                  statusText: "Service Unavailable",
                })
              );
            });
          }

          throw error;
        });
    }),
  );
});

// Background sync for queued actions (future enhancement)
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag);

  if (event.tag === "sync-projects") {
    event.waitUntil(
      // Implement project sync logic here
      Promise.resolve(),
    );
  }
});

// Push notifications (future enhancement)
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  const options = {
    body: event.data ? event.data.text() : "BoltForge notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(self.registration.showNotification("BoltForge", options));
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");
  event.notification.close();

  event.waitUntil(clients.openWindow("/"));
});

// Message handler for client communication
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({
      type: "VERSION",
      version: CACHE_NAME,
    });
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName)),
        );
      }),
    );
  }
});
