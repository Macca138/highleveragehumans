/**
 * High Leverage Humans - Service Worker
 * Provides PWA capabilities, caching, and offline functionality
 */

const CACHE_NAME = 'high-leverage-humans-v1.0.0';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/assets/css/main.css',
    '/assets/css/components.css',
    '/assets/css/animations.css',
    '/assets/css/responsive.css',
    '/assets/js/main.js',
    '/assets/js/forms.js',
    '/assets/js/animations.js',
    '/assets/js/performance.js',
    '/high-leverage-humans-logo.svg',
    '/high-leverage-humans-icon.svg'
];

// Runtime caching strategies
const RUNTIME_STRATEGIES = {
    images: 'CacheFirst',
    fonts: 'CacheFirst',
    api: 'NetworkFirst',
    pages: 'StaleWhileRevalidate'
};

// Configuration
const CONFIG = {
    maxAgeSeconds: {
        images: 30 * 24 * 60 * 60, // 30 days
        fonts: 365 * 24 * 60 * 60, // 1 year
        static: 7 * 24 * 60 * 60,  // 7 days
        api: 5 * 60                 // 5 minutes
    },
    maxEntries: {
        images: 50,
        fonts: 10,
        api: 20
    }
};

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Service Worker installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Service Worker installation failed:', error);
            })
    );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            cleanupOldCaches(),
            // Claim all clients
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker activated successfully');
        })
    );
});

/**
 * Fetch Event Handler
 */
self.addEventListener('fetch', (event) => {
    // Skip non-HTTP requests
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    // Skip requests with special headers (like range requests)
    if (event.request.headers.get('range')) {
        return;
    }
    
    const url = new URL(event.request.url);
    const request = event.request;
    
    // Determine caching strategy based on request type
    let strategy = determineStrategy(url, request);
    
    event.respondWith(
        executeStrategy(strategy, request, url)
            .catch((error) => {
                console.warn('Fetch failed:', error);
                return handleFetchError(request, error);
            })
    );
});

/**
 * Background Sync for form submissions
 */
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'form-submission') {
        event.waitUntil(syncFormSubmissions());
    }
    
    if (event.tag === 'analytics-data') {
        event.waitUntil(syncAnalyticsData());
    }
});

/**
 * Push Notification Handler
 */
self.addEventListener('push', (event) => {
    console.log('📬 Push notification received');
    
    const options = {
        body: 'New update available for High Leverage Humans',
        icon: '/high-leverage-humans-icon.svg',
        badge: '/high-leverage-humans-icon.svg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Update',
                icon: '/assets/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/assets/icons/close.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('High Leverage Humans', options)
    );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

/**
 * Message Handler for communication with main thread
 */
self.addEventListener('message', (event) => {
    console.log('💬 Message received:', event.data);
    
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_URLS':
            event.waitUntil(cacheUrls(payload.urls));
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(clearCache(payload.cacheName));
            break;
            
        case 'GET_CACHE_SIZE':
            event.waitUntil(getCacheSize().then(size => {
                event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
            }));
            break;
    }
});

/**
 * Determine caching strategy based on request
 */
function determineStrategy(url, request) {
    const pathname = url.pathname;
    const extension = pathname.split('.').pop().toLowerCase();
    
    // API requests
    if (pathname.startsWith('/api/')) {
        return RUNTIME_STRATEGIES.api;
    }
    
    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
        return RUNTIME_STRATEGIES.images;
    }
    
    // Fonts
    if (['woff', 'woff2', 'ttf', 'eot'].includes(extension)) {
        return RUNTIME_STRATEGIES.fonts;
    }
    
    // Static assets
    if (['css', 'js'].includes(extension)) {
        return 'CacheFirst';
    }
    
    // HTML pages
    if (request.mode === 'navigate' || pathname.endsWith('.html') || !extension) {
        return RUNTIME_STRATEGIES.pages;
    }
    
    // Default
    return 'NetworkFirst';
}

/**
 * Execute caching strategy
 */
async function executeStrategy(strategy, request, url) {
    switch (strategy) {
        case 'CacheFirst':
            return cacheFirst(request);
            
        case 'NetworkFirst':
            return networkFirst(request);
            
        case 'StaleWhileRevalidate':
            return staleWhileRevalidate(request);
            
        default:
            return fetch(request);
    }
}

/**
 * Cache First Strategy
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
}

/**
 * Network First Strategy
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            await cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

/**
 * Stale While Revalidate Strategy
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    });
    
    return cachedResponse || fetchPromise;
}

/**
 * Handle fetch errors
 */
async function handleFetchError(request, error) {
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
        const offlineResponse = await caches.match('/offline.html');
        if (offlineResponse) {
            return offlineResponse;
        }
    }
    
    // Return basic offline response
    return new Response(
        JSON.stringify({
            error: 'Network unavailable',
            message: 'This feature requires an internet connection'
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
}

/**
 * Clean up old caches
 */
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => 
        name !== CACHE_NAME && name !== RUNTIME_CACHE
    );
    
    await Promise.all(
        oldCaches.map(name => {
            console.log('🗑️ Deleting old cache:', name);
            return caches.delete(name);
        })
    );
}

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
    const cache = await caches.open(RUNTIME_CACHE);
    
    const cachePromises = urls.map(async (url) => {
        try {
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
                console.log('📦 Cached:', url);
            }
        } catch (error) {
            console.warn('Failed to cache:', url, error);
        }
    });
    
    await Promise.all(cachePromises);
}

/**
 * Clear specific cache
 */
async function clearCache(cacheName) {
    const deleted = await caches.delete(cacheName || RUNTIME_CACHE);
    console.log('🗑️ Cache cleared:', cacheName, deleted);
    return deleted;
}

/**
 * Get total cache size
 */
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const size = parseInt(response.headers.get('content-length')) || 0;
                totalSize += size;
            }
        }
    }
    
    return totalSize;
}

/**
 * Sync form submissions
 */
async function syncFormSubmissions() {
    console.log('🔄 Syncing form submissions...');
    
    // Get stored form submissions from IndexedDB
    const submissions = await getStoredSubmissions();
    
    for (const submission of submissions) {
        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(submission.data)
            });
            
            if (response.ok) {
                await removeStoredSubmission(submission.id);
                console.log('✅ Form submission synced:', submission.id);
            }
        } catch (error) {
            console.warn('Failed to sync submission:', submission.id, error);
        }
    }
}

/**
 * Sync analytics data
 */
async function syncAnalyticsData() {
    console.log('🔄 Syncing analytics data...');
    
    // Get stored analytics data
    const analyticsData = await getStoredAnalytics();
    
    for (const data of analyticsData) {
        try {
            const response = await fetch('/api/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                await removeStoredAnalytics(data.id);
                console.log('📊 Analytics data synced:', data.id);
            }
        } catch (error) {
            console.warn('Failed to sync analytics:', data.id, error);
        }
    }
}

/**
 * IndexedDB helpers for offline storage
 */
async function getStoredSubmissions() {
    // Placeholder for IndexedDB implementation
    return [];
}

async function removeStoredSubmission(id) {
    // Placeholder for IndexedDB implementation
    console.log('Removing stored submission:', id);
}

async function getStoredAnalytics() {
    // Placeholder for IndexedDB implementation
    return [];
}

async function removeStoredAnalytics(id) {
    // Placeholder for IndexedDB implementation
    console.log('Removing stored analytics:', id);
}

/**
 * Utility: Check if request is cacheable
 */
function isCacheable(request) {
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return false;
    }
    
    // Skip requests with authentication
    if (request.headers.get('authorization')) {
        return false;
    }
    
    // Skip admin areas
    if (url.pathname.startsWith('/admin/')) {
        return false;
    }
    
    return true;
}

/**
 * Utility: Log cache statistics
 */
async function logCacheStats() {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        console.log(`📊 Cache ${cacheName}: ${keys.length} entries`);
    }
}

// Log initial installation
console.log('🌟 High Leverage Humans Service Worker loaded');