const CACHE_NAME = 'azha-lanchpad-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/Azha LanchPad Icon..png',
    '/app.css',
    '/app.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});