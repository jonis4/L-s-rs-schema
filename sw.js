// Service worker: gör appen tillgänglig offline.
// Höj VERSION vid varje ändring av någon fil nedan, annars fastnar användarna på gammal kod.
const VERSION = "lasar-v3";
const FILES = [
  "./", "index.html", "data.js", "time.js", "storage.js", "app.js", "manifest.webmanifest",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", e => {
  // cache: "reload" går förbi webbläsarens HTTP-cache, så att en ny version inte blandas med gamla filer
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache först: appen har inga externa beroenden, så allt den behöver ligger i FILES
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
