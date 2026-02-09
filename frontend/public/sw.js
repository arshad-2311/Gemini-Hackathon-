// ============================================
// SERVICE WORKER FOR OFFLINE SUPPORT
// Caches static assets and translation data
// ============================================

const CACHE_NAME = 'sign-translator-v1';
const STATIC_CACHE = 'static-v1';
const TRANSLATION_CACHE = 'translations-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/src/main.jsx',
    '/src/App.jsx',
    '/src/App.css'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== TRANSLATION_CACHE)
                    .map((name) => {
                        console.log('Service Worker: Removing old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ============================================
// FETCH EVENT
// ============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip WebSocket requests
    if (url.pathname.includes('socket.io')) return;

    // API requests - network first, cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request, TRANSLATION_CACHE));
        return;
    }

    // Static assets - cache first, network fallback
    event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// ============================================
// CACHING STRATEGIES
// ============================================

// Cache first, then network
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);

    if (cached) {
        // Revalidate in background
        fetchAndCache(request, cacheName);
        return cached;
    }

    return fetchAndCache(request, cacheName);
}

// Network first, then cache
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);

        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        const cached = await caches.match(request);

        if (cached) {
            return cached;
        }

        // Return offline fallback for HTML
        if (request.headers.get('Accept')?.includes('text/html')) {
            return caches.match('/offline.html');
        }

        throw error;
    }
}

// Fetch and cache helper
async function fetchAndCache(request, cacheName) {
    try {
        const response = await fetch(request);

        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.error('Fetch failed:', error);
        throw error;
    }
}

// ============================================
// TRANSLATION CACHING
// ============================================

// Cache translation result
async function cacheTranslation(text, dialect, result) {
    const cache = await caches.open(TRANSLATION_CACHE);
    const key = `translation:${dialect}:${text}`;

    const response = new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
    });

    await cache.put(key, response);
}

// Get cached translation
async function getCachedTranslation(text, dialect) {
    const cache = await caches.open(TRANSLATION_CACHE);
    const key = `translation:${dialect}:${text}`;

    const response = await cache.match(key);

    if (response) {
        return response.json();
    }

    return null;
}

// ============================================
// MESSAGE HANDLING
// ============================================
self.addEventListener('message', (event) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'CACHE_TRANSLATION':
            cacheTranslation(payload.text, payload.dialect, payload.result);
            break;

        case 'GET_CACHED_TRANSLATION':
            getCachedTranslation(payload.text, payload.dialect)
                .then((result) => {
                    event.ports[0].postMessage({ type: 'CACHED_TRANSLATION', result });
                });
            break;

        case 'CLEAR_CACHE':
            caches.delete(TRANSLATION_CACHE)
                .then(() => {
                    event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
                });
            break;

        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
    }
});

console.log('Service Worker: Loaded');
