const CACHE_NAME = 'neurophysiology-tracker-v1.0.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const API_CACHE = 'api-v1';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
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

// Install Event - Cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch Event - Handle network requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/')) {
      // API requests - Network first, then cache
      event.respondWith(handleApiRequest(request));
    } else if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
      // Static assets - Cache first, then network
      event.respondWith(handleStaticRequest(request));
    } else {
      // Other requests - Stale while revalidate
      event.respondWith(handleDynamicRequest(request));
    }
  } else {
    // POST, PUT, DELETE requests - Handle with background sync
    event.respondWith(handleMutationRequest(request));
  }
});

// Handle API requests (Network first, then cache)
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving API from cache:', request.url);
      return cachedResponse;
    }
    
    // Return network response even if not ok
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'No network connection and no cached data available',
        offline: true 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static requests (Cache first, then network)
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log('[SW] Serving static from cache:', request.url);
    return cachedResponse;
  }
  
  // If not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    
    // Return offline page for HTML requests
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/neurophysiology_multilingual.html');
    }
    
    // Return empty response for other assets
    return new Response('', { status: 408, statusText: 'Request Timeout' });
  }
}

// Handle dynamic requests (Stale while revalidate)
async function handleDynamicRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  // Get cached version immediately
  const cachedResponse = await cache.match(request);
  
  // Fetch fresh version in background
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  // Return cached version if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Handle mutation requests (POST, PUT, DELETE)
async function handleMutationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // If offline, store for background sync
    if (request.method !== 'GET') {
      await storeForBackgroundSync(request);
      
      // Return success response to prevent UI errors
      return new Response(
        JSON.stringify({ 
          success: true, 
          offline: true,
          message: 'Request queued for when online' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Store requests for background sync
async function storeForBackgroundSync(request) {
  const db = await openDB();
  const transaction = db.transaction(['sync-requests'], 'readwrite');
  const store = transaction.objectStore('sync-requests');
  
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now()
  };
  
  await store.add(requestData);
  
  // Register background sync
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    self.registration.sync.register('background-sync');
  }
}

// Background Sync Event
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncPendingRequests());
  }
});

// Sync pending requests
async function syncPendingRequests() {
  const db = await openDB();
  const transaction = db.transaction(['sync-requests'], 'readwrite');
  const store = transaction.objectStore('sync-requests');
  const requests = await store.getAll();
  
  console.log('[SW] Syncing', requests.length, 'pending requests');
  
  for (const requestData of requests) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });
      
      if (response.ok) {
        // Remove successful request from store
        await store.delete(requestData.id);
        console.log('[SW] Successfully synced request:', requestData.url);
      }
    } catch (error) {
      console.log('[SW] Failed to sync request:', requestData.url, error);
    }
  }
}

// Push Event - Handle push notifications
self.addEventListener('push', event => {
  console.log('[SW] Push received:', event);
  
  const options = {
    body: 'New neurophysiology case data available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
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
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('Neurophysiology Tracker', options)
  );
});

// Notification Click Event
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app and navigate to cases
    event.waitUntil(
      clients.openWindow('/?page=cases')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message Event - Handle messages from main thread
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'CACHE_URLS':
        event.waitUntil(
          caches.open(DYNAMIC_CACHE).then(cache => {
            return cache.addAll(event.data.urls);
          })
        );
        break;
        
      case 'CLEAR_CACHE':
        event.waitUntil(
          caches.keys().then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            );
          })
        );
        break;
        
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
    }
  }
});

// IndexedDB helper functions
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('neurophysiology-sw-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create object store for sync requests
      if (!db.objectStoreNames.contains('sync-requests')) {
        const store = db.createObjectStore('sync-requests', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Periodic Background Sync (if supported)
self.addEventListener('periodicsync', event => {
  console.log('[SW] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'data-sync') {
    event.waitUntil(syncDataPeriodically());
  }
});

// Sync data periodically
async function syncDataPeriodically() {
  try {
    // Fetch latest data and update cache
    const cache = await caches.open(API_CACHE);
    
    for (const endpoint of API_ENDPOINTS) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          await cache.put(endpoint, response.clone());
          console.log('[SW] Updated cache for:', endpoint);
        }
      } catch (error) {
        console.log('[SW] Failed to update cache for:', endpoint);
      }
    }
    
    // Notify clients about data update
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DATA_UPDATED',
        timestamp: Date.now()
      });
    });
    
  } catch (error) {
    console.log('[SW] Periodic sync failed:', error);
  }
}

// Handle fetch errors gracefully
self.addEventListener('error', event => {
  console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

// Cleanup old data periodically
setInterval(async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['sync-requests'], 'readwrite');
    const store = transaction.objectStore('sync-requests');
    
    // Remove requests older than 7 days
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(cutoff);
    
    const oldRequests = await index.getAllKeys(range);
    for (const key of oldRequests) {
      await store.delete(key);
    }
    
    console.log('[SW] Cleaned up', oldRequests.length, 'old sync requests');
  } catch (error) {
    console.log('[SW] Cleanup failed:', error);
  }
}, 24 * 60 * 60 * 1000); // Run daily

console.log('[SW] Service Worker loaded successfully');