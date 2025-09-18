// sw.js - Adaptive Service Worker for Grind Time PWA
const scopeReference = self.registration?.scope
  ? new URL(self.registration.scope)
  : new URL(self.location.href);

const resolveBasePath = (pathname) => {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname : `${pathname}/`;
};

const BASE_PATH = resolveBasePath(scopeReference.pathname);
const cacheSuffix = BASE_PATH.replace(/[^a-z0-9_-]+/gi, '_');
const CACHE_NAME = `grind-time-v1.3::${cacheSuffix}`;

const STATIC_CACHE = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.json`,
];

const resolveAppPath = (candidate) => {
  if (!candidate) {
    return null;
  }

  try {
    const resolved = new URL(candidate, scopeReference);
    if (resolved.origin !== scopeReference.origin) {
      return null;
    }

    return resolved.pathname.startsWith(BASE_PATH) ? resolved.pathname : null;
  } catch (error) {
    console.warn('Service worker could not resolve asset path:', candidate, error);
    return null;
  }
};

const collectAssetUrls = (html) => {
  const assets = new Set();

  const addMatch = (regex) => {
    let match;
    while ((match = regex.exec(html)) !== null) {
      const path = resolveAppPath(match[1]);
      if (path) {
        assets.add(path);
      }
    }
  };

  addMatch(/href="([^"]*\.css)"/gi);
  addMatch(/src="([^"]*\.js)"/gi);
  addMatch(/href="([^"]*manifest[^"]*)"/gi);
  addMatch(/href="([^"]*\.(png|ico|svg|webp))"/gi);

  return Array.from(assets);
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('Opened cache with scope:', CACHE_NAME);

      await cache.addAll(STATIC_CACHE);

      try {
        const response = await fetch(`${BASE_PATH}index.html`);
        const html = await response.text();

        const assetUrls = collectAssetUrls(html);

        if (assetUrls.length > 0) {
          console.log('Caching discovered assets:', assetUrls);
          try {
            await cache.addAll(assetUrls);
          } catch (error) {
            console.warn('Some assets failed to cache:', error);
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

  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (
    requestUrl.origin !== scopeReference.origin ||
    !requestUrl.pathname.startsWith(BASE_PATH)
  ) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== 'basic'
          ) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
      .catch(() => {
        if (event.request.destination === 'document') {
          return caches.match(`${BASE_PATH}index.html`);
        }
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
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
      self.clients.claim(),
    ])
  );
});
