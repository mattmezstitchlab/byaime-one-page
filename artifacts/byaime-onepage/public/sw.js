/*
 * Service worker AIME — coquille hors-ligne installable (PWA).
 * Stratégie sobre :
 * - navigations : network-first, avec dernier shell connu en secours ;
 * - assets immuables hashés (/assets/*) : stale-while-revalidate ;
 * - images : cache-first avec plafond ;
 * - tout le reste (API, Clerk) n'est jamais mis en cache.
 * Pas de précache : l'application est mono-shell (SPA), le premier rendu
 * réseau suffit à obtenir la dernière version.
 */
const VERSION = "aime-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const IMAGE_CACHE = `${VERSION}-images`;
const IMAGE_LIMIT = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

const trimCache = async (name, limit) => {
  const cache = await caches.open(name);
  const entries = await cache.keys();
  if (entries.length <= limit) return;
  await Promise.all(entries.slice(0, entries.length - limit).map((request) => cache.delete(request)));
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations : network-first, hors-ligne -> dernier shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(async () => (await caches.match("/")) || (await caches.match(request))),
    );
    return;
  }

  // Assets hashés : stale-while-revalidate.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // Images locales : cache-first plafonné.
  if (url.pathname.startsWith("/images/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches
            .open(IMAGE_CACHE)
            .then(async (cache) => {
              await cache.put(request, copy);
              await trimCache(IMAGE_CACHE, IMAGE_LIMIT);
            });
          return response;
        }).catch(() => cached);
      }),
    );
  }
});
