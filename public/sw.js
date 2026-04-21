const CACHE_NAME = "allomaison-v1";
const URLS_TO_CACHE = [
  "/",
  "/index.html",
];

// Installation — mise en cache des ressources de base
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activation — suppression des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — réseau en priorité, cache en secours
self.addEventListener("fetch", (event) => {
  // Ne pas intercepter les requêtes Firebase / Cloudinary / API externes
  if (
    event.request.url.includes("firestore.googleapis.com") ||
    event.request.url.includes("firebase") ||
    event.request.url.includes("cloudinary") ||
    event.request.url.includes("nominatim") ||
    event.request.url.includes("openstreetmap")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache la réponse si c'est une vraie ressource
        if (response && response.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Hors ligne → servir depuis le cache
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("/index.html");
        });
      })
  );
});