// ============================================================
// sw.js — Service Worker for Nimbus (static caching only)
// ============================================================

const CACHE_NAME = 'nimbus-v1';
const PRECACHE = [
	'./',
	'./index.html',
	'./css/styles.css',
	'./js/app.js',
	'./js/utils.js',
	'./js/api.js',
	'./js/icons.js',
	'./js/charts.js',
	'./js/widgets.js',
	'./js/background.js',
	'./assets/icon.svg',
	'./manifest.webmanifest',
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests
	if (request.method !== 'GET') return;

	// Skip cross-origin requests
	if (!url.origin.startsWith(self.location.origin)) return;

	// For HTML requests, always try network first, fallback to cache
	if (request.headers.get('accept')?.includes('text/html')) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const responseClone = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(request, responseClone);
					});
					return response;
				})
				.catch(() => caches.match(request)),
		);
		return;
	}

	// For static assets, use cache-first strategy
	event.respondWith(
		caches.match(request).then((cached) => {
			if (cached) {
				const fetchPromise = fetch(request)
					.then((response) => {
						if (response.ok) {
							caches.open(CACHE_NAME).then((cache) => {
								cache.put(request, response);
							});
						}
						return response;
					})
					.catch(() => cached);
				return cached;
			}
			return fetch(request).then((response) => {
				if (response.ok) {
					const responseClone = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(request, responseClone);
					});
				}
				return response;
			});
		}),
	);
});
