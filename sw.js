// ✅ Simple Service Worker for Audio Context Persistence
const CACHE_NAME = 'gold-miner-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/src/main.js',
    // Add more static assets as needed
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            }
        )
    );
});

// Keep audio context alive during app switches
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'KEEP_AUDIO_ALIVE') {
        // Service worker keeping audio context alive
        // Prevent audio context from being suspended
        event.waitUntil(
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'RESUME_AUDIO_CONTEXT'
                    });
                });
            })
        );
    }
});
