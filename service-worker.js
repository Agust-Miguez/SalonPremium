const CACHE_NAME = 'nexus-premium-cache-v1';
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/styles.css',
  '/api.js',
  '/ui.js',
  '/app.js',
  '/manifest.json'
  // Nota: las fuentes de google se cachean diferente abajo
];

// Instalar el Service Worker y cachear recursos críticos
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caché abierta. Almacenando recursos críticos.');
      return cache.addAll(CRITICAL_RESOURCES);
    })
  );
});

// Limpiar cachés antiguas al activar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log(`SW: Limpiando caché antigua ${name}`);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones y servir desde caché (Estrategia Cache First, Falling back to Network)
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones a APIs externas (ej. el Webhook de Make)
  if (event.request.url.includes('make.com')) {
    return;
  }

  // Estrategia para recursos propios (Stale-While-Revalidate modificado o Cache First)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Si está en caché, lo servimos al instante para máximo performance
      if (cachedResponse) {
        // En background, actualizamos la caché para la próxima vez (opcional pero recomendado)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
             caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});

        return cachedResponse;
      }

      // 2. Si no está en caché, vamos a la red
      return fetch(event.request).then((networkResponse) => {
        // Cachear las fuentes dinámicas de Google o imágenes
        if (
          !cachedResponse &&
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.url.includes('fonts.googleapis.com') ||
           event.request.url.includes('fonts.gstatic.com'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
         // Fallback para cuando no hay internet y no está en caché
         // (Se podría retornar una página HTML de "Modo Offline" si existiera)
         console.error('Fetch failed, no network and not in cache.', err);
      });
    })
  );
});