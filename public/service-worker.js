const CACHE_NAME = 'phis-exam-v1';
const urlsToCache = [
  '/',
  '/student.html',
  '/teacher.html',
  '/admin.html',
  '/css/font-awesome.min.css',
  '/Badgejet.jpg',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch event - network first, then cache
self.addEventListener('fetch', event => {
  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Return cached version if offline
        return caches.match(event.request);
      })
  );
});

// Background sync for offline submissions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-exam-submissions') {
    event.waitUntil(syncExamSubmissions());
  }
});

async function syncExamSubmissions() {
  try {
    const db = await openDB();
    const submissions = await db.getAll('offline-submissions');
    
    for (const submission of submissions) {
      try {
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission.data)
        });
        
        if (response.ok) {
          await db.delete('offline-submissions', submission.id);
        }
      } catch (error) {
        console.error('Sync failed for submission:', submission.id);
      }
    }
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PHISExamDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline-submissions')) {
        db.createObjectStore('offline-submissions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

console.log('[Service Worker] Registered and ready');