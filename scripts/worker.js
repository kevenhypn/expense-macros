const scope = new URL(self.registration.scope);
const prefix = `expense-macros:${scope.pathname}:`;
const cacheName = prefix + BUILD_VERSION;
const appShell = new URL("index.html", scope).href;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(cacheName).then(cache =>
    cache.addAll(BUILD_FILES.map(file => new Request(new URL(file, scope), { cache: "reload" }))),
  ));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName).map(key => caches.delete(key))),
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (request.mode === "navigate" && (url.pathname === scope.pathname || url.pathname === new URL(appShell).pathname)) {
    // Serve the matching HTML and assets from one build until the next worker activates.
    event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(appShell)) ?? fetch(request)));
    return;
  }
  event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(request)) ?? fetch(request)));
});
