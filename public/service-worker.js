// Service Worker for Peter Harvard International Schools Exam System v2.0
const CACHE_NAME = 'phis-exam-cache-v2';
const API_CACHE_NAME = 'phis-api-cache-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/student.html',
  '/teacher.html',
  '/admin.html',
  '/install.html',
  '/manifest.json',
  '/Badgejet.ico',
  '/Badgejet.jpg',
  '/logo.png',
  '/css/font-awesome.min.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Check if request is an API call
function isApiRequest(url) {
  return url.includes('/api/');
}

// Helper: Check if request is for a static asset
function isStaticAsset(url) {
  const staticExtensions = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => url.endsWith(ext)) || url.includes('/css/') || url.includes('/js/') || url === '/' || url.endsWith('/');
}

// Helper: Check if request is for an exam file
function isExamFile(url) {
  return url.includes('/api/exam/') || url.includes('/uploads/');
}

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Skip cross-origin requests
  if (!url.startsWith(self.location.origin) && !url.startsWith('http://localhost')) {
    return;
  }

  // Handle API requests differently
  if (isApiRequest(url)) {
    // For API requests: Network first, then cache (stale-while-revalidate pattern)
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache successful API responses
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(API_CACHE_NAME)
              .then((cache) => {
                // Don't cache large responses
                if (responseToCache.headers.get('content-length') < 500000) {
                  cache.put(event.request, responseToCache);
                }
              })
              .catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // For exam files, return offline message
              if (isExamFile(url)) {
                return new Response(
                  JSON.stringify({ error: 'You are offline. Please connect to the network to access exams.', offline: true }),
                  { headers: { 'Content-Type': 'application/json' } }
                );
              }
              return new Response(
                JSON.stringify({ error: 'Network error. Please check your connection.' }),
                { headers: { 'Content-Type': 'application/json' } }
              );
            });
        })
    );
    return;
  }

  // For static assets: Cache first, then network
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version and update cache in background
            const fetchPromise = fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse.status === 200) {
                  caches.open(CACHE_NAME)
                    .then((cache) => cache.put(event.request, networkResponse.clone()))
                    .catch(() => {});
                }
                return networkResponse;
              })
              .catch(() => {});
            return cachedResponse;
          }

          // If not in cache, fetch from network
          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(event.request, responseToCache))
                  .catch(() => {});
              }
              return networkResponse;
            })
            .catch(() => {
              // If all fails, return offline page
              if (url.endsWith('.html') || url === '/' || url.endsWith('/')) {
                return caches.match('/');
              }
              return new Response('Offline content unavailable', { status: 503 });
            });
        })
    );
    return;
  }

  // Default: Network first
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// Background sync for offline submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'exam-submission-sync') {
    console.log('[Service Worker] Syncing offline exam submissions');
    event.waitUntil(syncOfflineSubmissions());
  }
});

// Function to sync offline submissions
async function syncOfflineSubmissions() {
  try {
    const db = await openOfflineDB();
    const submissions = await getOfflineSubmissions(db);
    
    for (const submission of submissions) {
      try {
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission.data)
        });
        
        if (response.ok) {
          await removeOfflineSubmission(db, submission.id);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync submission:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// IndexedDB helper functions for offline storage
async function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineExamDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('submissions')) {
        db.createObjectStore('submissions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function getOfflineSubmissions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['submissions'], 'readonly');
    const store = transaction.objectStore('submissions');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function removeOfflineSubmission(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['submissions'], 'readwrite');
    const store = transaction.objectStore('submissions');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Push notification handler
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Open Exam System'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('PHIS Exam System', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for PWA install prompt
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] Registered and ready');