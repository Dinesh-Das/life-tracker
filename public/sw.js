/* LifeTracker service worker — app shell + runtime caching.
   Bump CACHE_VERSION to invalidate old caches on deploy. */
const CACHE_VERSION = 'lifetracker-v4';
const APP_SHELL = ['/', '/manifest.webmanifest', '/logo.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

function staleWhileRevalidate(request) {
    return caches.open(CACHE_VERSION).then((cache) =>
        cache.match(request).then((cached) => {
            const network = fetch(request)
                .then((res) => {
                    if (res && res.status === 200) cache.put(request, res.clone());
                    return res;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Cross-origin (Sheets / OAuth traffic): never intercept.
    // Fonts are self-hosted via @fontsource, so no font CDN caching is needed.
    if (url.origin !== self.location.origin) return;

    // SPA navigations: network-first, fall back to cached shell when offline
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put('/', copy));
                    return res;
                })
                .catch(() => caches.match('/'))
        );
        return;
    }

    // Hashed build assets, images, fonts: stale-while-revalidate
    if (/\.(js|css|png|svg|woff2?)$/.test(url.pathname)) {
        event.respondWith(staleWhileRevalidate(request));
    }
});

self.addEventListener('push', (event) => {
    let payload = {};
    try { payload = event.data?.json() || {}; } catch { payload = { body: event.data?.text() }; }
    event.waitUntil(self.registration.showNotification(payload.title || 'LifeTracker', {
        body: payload.body || 'It is time for your check-in.',
        icon: '/logo.png', badge: '/logo.png', data: { url: payload.url || '/daily' },
        tag: payload.tag || 'lifetracker-reminder', renotify: true,
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    let target = new URL('/daily', self.location.origin);
    try {
        const requested = new URL(event.notification.data?.url || '/daily', self.location.origin);
        if (requested.origin === self.location.origin) target = requested;
    } catch { /* use safe default */ }
    event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
        const existing = windows.find(client => {
            const clientUrl = new URL(client.url);
            return clientUrl.pathname === target.pathname && clientUrl.search === target.search;
        });
        return existing ? existing.focus() : clients.openWindow(target.href);
    }));
});
