// TOND HK Service Worker - Ultra-Light Version
// This file satisfies the "Offline" requirement for APK generation.
const CACHE_NAME = "tond-hk-final-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/"]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Simplest fetch handler to ensure PWA installability
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
