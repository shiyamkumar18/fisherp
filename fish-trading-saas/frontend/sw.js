// PWA Service Worker for FishTrader Landing
const CACHE_NAME = 'fish-trader-v1';
const urlsToCache = [
  '/',
  '/frontend/',
  '/frontend/index.html',
  '/frontend/styles.css',
  '/frontend/js/auth-modal.js',
  '/frontend/manifest.json',
  '/frontend/icon-192.png',
  '/frontend/icon-512.png'
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
