const CACHE_NAME = "memories-shell-v1";

const APP_SHELL = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
    }),
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(
            (name) => name.startsWith("memories-shell-") && name !== CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Handle only GET requests from this website.
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Never cache API requests.
  if (url.pathname.startsWith("/api/")) return;

  // For page navigation, try the network first.
  // If offline, serve the cached app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        return (await caches.match("/index.html")) || (await caches.match("/"));
      }),
    );
    return;
  }

  // For static files, prefer cache and fall back to network.
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }

      const response = await fetch(request);

      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    })(),
  );
});
