// sw.js - Fixed Service Worker for Grind Time PWA
const CACHE_NAME = 'grind-time-v1.3';
const BASE_PATH = '/GrindTime-WrkHrs/';

// Core app files to cache (fixed variable name)
const STATIC_CACHE = [BASE_PATH, BASE_PATH + 'index.html'];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('Opened cache');

      // Cache static files first
      await cache.addAll(STATIC_CACHE);

      // Try to fetch and cache the index.html to discover asset URLs
      try {
        const response = await fetch(BASE_PATH + 'index.html');
        const html = await response.text();

        // Extract asset URLs from the HTML
        const assetUrls = [];

        // Match CSS files
        const cssMatches = html.match(/href="([^"]*\.css)"/g);
        if (cssMatches) {
          cssMatches.forEach((match) => {
            const url = match.match(/href="([^"]*)"/)[1];
            if (url.startsWith('/GrindTime-WrkHrs/') || url.startsWith('./')) {
              // Convert relative to absolute
              const absoluteUrl = url.startsWith('./')
                ? BASE_PATH + url.slice(2)
                : url;
              assetUrls.push(absoluteUrl);
            }
          });
        }

        // Match JS files
        const jsMatches = html.match(/src="([^"]*\.js)"/g);
        if (jsMatches) {
          jsMatches.forEach((match) => {
            const url = match.match(/src="([^"]*)"/)[1];
            if (url.startsWith('/GrindTime-WrkHrs/') || url.startsWith('./')) {
              const absoluteUrl = url.startsWith('./')
                ? BASE_PATH + url.slice(2)
                : url;
              assetUrls.push(absoluteUrl);
            }
          });
        }

        // Match manifest
        const manifestMatch = html.match(/href="([^"]*manifest[^"]*)"/);
        if (manifestMatch) {
          const url = manifestMatch[1];
          const absoluteUrl = url.startsWith('/') ? url : BASE_PATH + url;
          assetUrls.push(absoluteUrl);
        }

        // Match icons
        const iconMatches = html.match(/href="([^"]*\.(png|ico))"/g);
        if (iconMatches) {
          iconMatches.forEach((match) => {
            const url = match.match(/href="([^"]*)"/)[1];
            if (url.startsWith('/')) {
              assetUrls.push(url);
            }
          });
        }

        // Cache discovered assets
        if (assetUrls.length > 0) {
          console.log('Caching discovered assets:', assetUrls);
          try {
            await cache.addAll(assetUrls);
          } catch (error) {
            console.warn('Some assets failed to cache:', error);
            // Try to cache them individually
            for (const url of assetUrls) {
              try {
                await cache.add(url);
              } catch (e) {
                console.warn('Failed to cache:', url, e);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Could not discover assets from index.html:', error);
      }
    })
  );

  // force the SW to take control immediately
  self.skipWaiting();
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  // Only handle requests for our app
  if (!event.request.url.startsWith(self.location.origin + BASE_PATH)) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        // If not in cache, fetch from network
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (
            !response ||
            response.status !== 200 ||
            response.type !== 'basic'
          ) {
            return response;
          }

          // Clone the response since it can only be consumed once
          const responseToCache = response.clone();

          // Add to cache for future use
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, return offline page for navigation
        if (event.request.destination === 'document') {
          return caches.match(BASE_PATH + 'index.html');
        }
      })
  );
});

// Activate event - remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
    ])
  );
});
