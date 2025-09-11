const CACHE_NAME = 'neurophysiology-tracker-v1.0.0';
const DATA_CACHE_NAME = 'neurophysiology-data-v1.0.0';

// Files to cache for offline functionality
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/neurophysiology_multilingual.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/cases',
  '/api/doctors',
  '/api/branches',
  '/api/exam-types',
  '/api/dashboard/stats'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching offline page');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME)
        .then((cache) => {
          return fetch(request)
            .then((response) => {
              // If the request was successful, clone the response and store it in the cache
              if (response.status === 200) {
                cache.put(request.url, response.clone());
              }
              return response;
            })
            .catch(() => {
              // If the network request failed, try to get it from the cache
              return cache.match(request);
            });
        })
    );
    return;
  }

  // Handle static file requests
  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(request);
      })
      .catch(() => {
        // If both cache and network fail, return offline page for navigation requests
        if (request.destination === 'document') {
          return caches.match('/neurophysiology_multilingual.html');
        }
      })
  );
});

// Background Sync - sync data when connection is restored
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncData());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push Received.');
  
  const options = {
    body: event.data ? event.data.text() : 'New neurophysiology case added',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Cases',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Neurophysiology Tracker', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click Received.');

  event.notification.close();

  if (event.action === 'explore') {
    // Open the app and navigate to cases page
    event.waitUntil(
      clients.openWindow('/?page=cases')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    event.notification.close();
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(event.data.payload))
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Sync function for background sync
async function syncData() {
  try {
    console.log('[ServiceWorker] Syncing data...');
    
    // Get pending sync data from IndexedDB or localStorage
    const pendingData = await getPendingData();
    
    if (pendingData && pendingData.length > 0) {
      for (const item of pendingData) {
        try {
          const response = await fetch(item.url, {
            method: item.method,
            headers: {
              'Content-Type': 'application/json'
            },
            body: item.data ? JSON.stringify(item.data) : undefined
          });
          
          if (response.ok) {
            // Remove from pending data
            await removePendingData(item.id);
            console.log('[ServiceWorker] Synced:', item.url);
          }
        } catch (error) {
          console.error('[ServiceWorker] Sync failed for:', item.url, error);
        }
      }
    }
    
    // Notify all clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
    
  } catch (error) {
    console.error('[ServiceWorker] Background sync failed:', error);
  }
}

// Helper function to get pending data (simplified - would use IndexedDB in production)
async function getPendingData() {
  try {
    // This would typically use IndexedDB
    // For now, we'll use a simple approach
    return [];
  } catch (error) {
    console.error('[ServiceWorker] Error getting pending data:', error);
    return [];
  }
}

// Helper function to remove pending data
async function removePendingData(id) {
  try {
    // This would typically use IndexedDB
    console.log('[ServiceWorker] Removed pending data:', id);
  } catch (error) {
    console.error('[ServiceWorker] Error removing pending data:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'neurophysiology-sync') {
    event.waitUntil(syncData());
  }
});

// Handle fetch errors gracefully
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Return a custom offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/neurophysiology_multilingual.html');
            }
            
            // Return a generic offline response for other requests
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Cache management utilities
const CacheManager = {
  // Update cache with new version
  async updateCache(cacheName, urls) {
    const cache = await caches.open(cacheName);
    return Promise.all(
      urls.map(url => {
        return fetch(url).then(response => {
          if (response.ok) {
            return cache.put(url, response);
          }
        }).catch(error => {
          console.warn(`Failed to cache ${url}:`, error);
        });
      })
    );
  },
  
  // Clean old caches
  async cleanOldCaches(currentCaches) {
    const cacheNames = await caches.keys();
    return Promise.all(
      cacheNames.map(cacheName => {
        if (!currentCaches.includes(cacheName)) {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        }
      })
    );
  },
  
  // Get cache size
  async getCacheSize(cacheName) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    let size = 0;
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        size += blob.size;
      }
    }
    
    return size;
  }
};

// Performance monitoring
const PerformanceMonitor = {
  // Track cache hit rates
  cacheHits: 0,
  cacheMisses: 0,
  
  recordCacheHit() {
    this.cacheHits++;
  },
  
  recordCacheMiss() {
    this.cacheMisses++;
  },
  
  getCacheHitRate() {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  },
  
  // Send performance data to main thread
  async sendPerformanceData() {
    const clients = await self.clients.matchAll();
    const data = {
      type: 'PERFORMANCE_DATA',
      cacheHitRate: this.getCacheHitRate(),
      cacheSize: await CacheManager.getCacheSize(CACHE_NAME),
      timestamp: Date.now()
    };
    
    clients.forEach(client => {
      client.postMessage(data);
    });
  }
};

// Send performance data periodically
setInterval(() => {
  PerformanceMonitor.sendPerformanceData();
}, 60000); // Every minute

console.log('[ServiceWorker] Service Worker loaded successfully');