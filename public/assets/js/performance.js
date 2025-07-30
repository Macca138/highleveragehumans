/**
 * High Leverage Humans - Performance Monitor
 * Handles performance monitoring, optimization, and analytics
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.isMonitoring = false;
        this.config = {
            trackingEnabled: true,
            analyticsEndpoint: '/api/analytics',
            performanceThresholds: {
                fcp: 2500,    // First Contentful Paint
                lcp: 4000,    // Largest Contentful Paint
                fid: 100,     // First Input Delay
                cls: 0.1,     // Cumulative Layout Shift
                ttfb: 800     // Time to First Byte
            },
            reportingInterval: 30000, // 30 seconds
            batchSize: 10
        };
        
        this.eventQueue = [];
        this.reportingTimer = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.trackEvent = this.trackEvent.bind(this);
        this.trackError = this.trackError.bind(this);
        this.reportMetrics = this.reportMetrics.bind(this);
    }

    /**
     * Initialize performance monitoring
     */
    async init() {
        try {
            console.log('📊 Initializing Performance Monitor');
            
            // Check if Performance API is available
            if (!window.performance) {
                console.warn('Performance API not available');
                return;
            }
            
            // Initialize core web vitals tracking
            this.initializeCoreWebVitals();
            
            // Initialize resource monitoring
            this.initializeResourceMonitoring();
            
            // Initialize user interaction tracking
            this.initializeInteractionTracking();
            
            // Initialize error tracking
            this.initializeErrorTracking();
            
            // Initialize memory monitoring
            this.initializeMemoryMonitoring();
            
            // Start periodic reporting
            this.startPeriodicReporting();
            
            // Track initial page load
            this.trackPageLoad();
            
            this.isMonitoring = true;
            console.log('✅ Performance Monitor initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Performance Monitor:', error);
            throw error;
        }
    }

    /**
     * Initialize Core Web Vitals tracking
     */
    initializeCoreWebVitals() {
        // First Contentful Paint (FCP)
        this.observePerformanceEntry('paint', (entries) => {
            entries.forEach(entry => {
                if (entry.name === 'first-contentful-paint') {
                    this.recordMetric('fcp', entry.startTime, {
                        threshold: this.config.performanceThresholds.fcp,
                        critical: entry.startTime > this.config.performanceThresholds.fcp
                    });
                }
            });
        });

        // Largest Contentful Paint (LCP)
        this.observePerformanceEntry('largest-contentful-paint', (entries) => {
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
                this.recordMetric('lcp', lastEntry.startTime, {
                    threshold: this.config.performanceThresholds.lcp,
                    critical: lastEntry.startTime > this.config.performanceThresholds.lcp,
                    element: lastEntry.element?.tagName
                });
            }
        });

        // First Input Delay (FID)
        this.observePerformanceEntry('first-input', (entries) => {
            entries.forEach(entry => {
                this.recordMetric('fid', entry.processingStart - entry.startTime, {
                    threshold: this.config.performanceThresholds.fid,
                    critical: (entry.processingStart - entry.startTime) > this.config.performanceThresholds.fid,
                    inputType: entry.name
                });
            });
        });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        this.observePerformanceEntry('layout-shift', (entries) => {
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });
            
            this.recordMetric('cls', clsValue, {
                threshold: this.config.performanceThresholds.cls,
                critical: clsValue > this.config.performanceThresholds.cls
            });
        });
    }

    /**
     * Initialize resource monitoring
     */
    initializeResourceMonitoring() {
        // Monitor resource loading
        this.observePerformanceEntry('resource', (entries) => {
            entries.forEach(entry => {
                const resourceType = entry.initiatorType;
                const loadTime = entry.responseEnd - entry.startTime;
                const size = entry.transferSize || 0;
                
                this.recordMetric('resource_load', loadTime, {
                    resourceType,
                    url: entry.name,
                    size,
                    cached: entry.transferSize === 0 && entry.decodedBodySize > 0
                });
                
                // Track slow resources
                if (loadTime > 2000) {
                    this.trackEvent('slow_resource', {
                        url: entry.name,
                        type: resourceType,
                        loadTime,
                        size
                    });
                }
            });
        });

        // Monitor navigation timing
        this.observePerformanceEntry('navigation', (entries) => {
            entries.forEach(entry => {
                const ttfb = entry.responseStart - entry.requestStart;
                
                this.recordMetric('ttfb', ttfb, {
                    threshold: this.config.performanceThresholds.ttfb,
                    critical: ttfb > this.config.performanceThresholds.ttfb
                });
                
                // Track detailed navigation metrics
                this.recordMetric('dns_lookup', entry.domainLookupEnd - entry.domainLookupStart);
                this.recordMetric('tcp_connect', entry.connectEnd - entry.connectStart);
                this.recordMetric('dom_content_loaded', entry.domContentLoadedEventEnd - entry.navigationStart);
                this.recordMetric('window_load', entry.loadEventEnd - entry.navigationStart);
            });
        });
    }

    /**
     * Initialize user interaction tracking
     */
    initializeInteractionTracking() {
        // Track click interactions
        document.addEventListener('click', (event) => {
            const target = event.target;
            const selector = this.getElementSelector(target);
            
            this.trackEvent('user_interaction', {
                type: 'click',
                element: target.tagName,
                selector,
                timestamp: Date.now()
            });
        }, { passive: true });

        // Track scroll behavior
        let scrollTimeout;
        let scrollDepth = 0;
        
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            
            const currentScroll = Math.max(
                window.pageYOffset / (document.body.scrollHeight - window.innerHeight)
            );
            
            if (currentScroll > scrollDepth) {
                scrollDepth = currentScroll;
            }
            
            scrollTimeout = setTimeout(() => {
                this.trackEvent('scroll_depth', {
                    depth: Math.round(scrollDepth * 100),
                    timestamp: Date.now()
                });
            }, 250);
        }, { passive: true });

        // Track form interactions
        document.addEventListener('submit', (event) => {
            const form = event.target;
            if (form.tagName === 'FORM') {
                this.trackEvent('form_interaction', {
                    type: 'submit',
                    formId: form.id,
                    formType: form.dataset.formType,
                    timestamp: Date.now()
                });
            }
        }, { passive: true });
    }

    /**
     * Initialize error tracking
     */
    initializeErrorTracking() {
        // JavaScript errors
        window.addEventListener('error', (event) => {
            this.trackError('javascript_error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });

        // Promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError('promise_rejection', {
                reason: event.reason?.toString(),
                stack: event.reason?.stack
            });
        });

        // Resource loading errors
        document.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.trackError('resource_error', {
                    element: event.target.tagName,
                    source: event.target.src || event.target.href,
                    type: event.target.type
                });
            }
        }, true);
    }

    /**
     * Initialize memory monitoring
     */
    initializeMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                
                this.recordMetric('memory_used', memory.usedJSHeapSize, {
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit,
                    percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
                });
                
                // Warn if memory usage is high
                const memoryPercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
                if (memoryPercentage > 80) {
                    this.trackEvent('high_memory_usage', {
                        percentage: memoryPercentage,
                        used: memory.usedJSHeapSize,
                        limit: memory.jsHeapSizeLimit
                    });
                }
            }, 10000); // Check every 10 seconds
        }
    }

    /**
     * Observe performance entries
     */
    observePerformanceEntry(type, callback) {
        if (!window.PerformanceObserver) return;
        
        try {
            const observer = new PerformanceObserver(callback);
            observer.observe({ type, buffered: true });
            this.observers.set(type, observer);
        } catch (error) {
            console.warn(`Failed to observe performance entry type: ${type}`, error);
        }
    }

    /**
     * Record performance metric
     */
    recordMetric(name, value, metadata = {}) {
        const metric = {
            name,
            value,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...metadata
        };
        
        this.metrics.set(`${name}_${Date.now()}`, metric);
        
        // Log critical metrics
        if (metadata.critical) {
            console.warn(`Critical performance metric: ${name} = ${value}ms`, metadata);
        }
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('performance:metric', {
            detail: metric
        }));
    }

    /**
     * Track custom event
     */
    trackEvent(eventName, data = {}) {
        const event = {
            name: eventName,
            data,
            timestamp: Date.now(),
            url: window.location.href,
            sessionId: this.getSessionId()
        };
        
        this.eventQueue.push(event);
        
        // Batch send if queue is full
        if (this.eventQueue.length >= this.config.batchSize) {
            this.sendEvents();
        }
    }

    /**
     * Track error
     */
    trackError(errorType, errorData) {
        this.trackEvent('error', {
            type: errorType,
            ...errorData
        });
        
        console.error(`Performance Monitor - ${errorType}:`, errorData);
    }

    /**
     * Track page load performance
     */
    trackPageLoad() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    this.trackEvent('page_load', {
                        loadTime: navigation.loadEventEnd - navigation.navigationStart,
                        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
                        firstByte: navigation.responseStart - navigation.requestStart,
                        domComplete: navigation.domComplete - navigation.navigationStart
                    });
                }
            }, 0);
        });
    }

    /**
     * Start periodic reporting
     */
    startPeriodicReporting() {
        this.reportingTimer = setInterval(() => {
            this.sendEvents();
            this.sendMetrics();
        }, this.config.reportingInterval);
    }

    /**
     * Send events to analytics
     */
    async sendEvents() {
        if (!this.config.trackingEnabled || this.eventQueue.length === 0) {
            return;
        }
        
        const events = [...this.eventQueue];
        this.eventQueue = [];
        
        try {
            // Send to Google Analytics if available
            if (typeof gtag !== 'undefined') {
                events.forEach(event => {
                    gtag('event', event.name, {
                        event_category: 'Performance',
                        custom_map: event.data
                    });
                });
            }
            
            // Send to custom endpoint
            await this.sendToEndpoint('/api/events', { events });
            
        } catch (error) {
            console.warn('Failed to send events:', error);
            // Re-queue events for retry
            this.eventQueue.unshift(...events);
        }
    }

    /**
     * Send metrics to analytics
     */
    async sendMetrics() {
        if (!this.config.trackingEnabled || this.metrics.size === 0) {
            return;
        }
        
        const metrics = Array.from(this.metrics.values());
        this.metrics.clear();
        
        try {
            await this.sendToEndpoint('/api/metrics', { metrics });
        } catch (error) {
            console.warn('Failed to send metrics:', error);
        }
    }

    /**
     * Send data to endpoint
     */
    async sendToEndpoint(endpoint, data) {
        if (!navigator.onLine) {
            throw new Error('Network offline');
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    }

    /**
     * Get element selector
     */
    getElementSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }
        
        if (element.className) {
            return `.${Array.from(element.classList).join('.')}`;
        }
        
        return element.tagName.toLowerCase();
    }

    /**
     * Get session ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('hlh_session_id');
        
        if (!sessionId) {
            sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            sessionStorage.setItem('hlh_session_id', sessionId);
        }
        
        return sessionId;
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        const summary = {
            metrics: Array.from(this.metrics.values()),
            events: [...this.eventQueue],
            timestamp: Date.now()
        };
        
        return summary;
    }

    /**
     * Optimize performance based on metrics
     */
    optimizePerformance() {
        // Check for performance issues and apply optimizations
        
        // Reduce animation quality if FPS is low
        const fps = this.getCurrentFPS();
        if (fps < 30) {
            document.dispatchEvent(new CustomEvent('performance:optimize', {
                detail: { type: 'reduce_animations', fps }
            }));
        }
        
        // Reduce particle count if memory usage is high
        if ('memory' in performance) {
            const memoryPercentage = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
            if (memoryPercentage > 70) {
                document.dispatchEvent(new CustomEvent('performance:optimize', {
                    detail: { type: 'reduce_particles', memoryPercentage }
                }));
            }
        }
    }

    /**
     * Get current FPS
     */
    getCurrentFPS() {
        return new Promise((resolve) => {
            let frames = 0;
            const startTime = performance.now();
            
            function countFrames() {
                frames++;
                const currentTime = performance.now();
                
                if (currentTime - startTime >= 1000) {
                    resolve(frames);
                } else {
                    requestAnimationFrame(countFrames);
                }
            }
            
            requestAnimationFrame(countFrames);
        });
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange(isVisible) {
        if (isVisible) {
            this.startPeriodicReporting();
        } else {
            if (this.reportingTimer) {
                clearInterval(this.reportingTimer);
            }
            // Send final batch before hiding
            this.sendEvents();
            this.sendMetrics();
        }
    }

    /**
     * Report metrics immediately
     */
    async reportMetrics() {
        await this.sendEvents();
        await this.sendMetrics();
    }

    /**
     * Destroy performance monitor
     */
    destroy() {
        if (this.reportingTimer) {
            clearInterval(this.reportingTimer);
        }
        
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        
        // Send final report
        this.sendEvents();
        this.sendMetrics();
        
        this.observers.clear();
        this.metrics.clear();
        this.eventQueue = [];
        this.isMonitoring = false;
    }
}

// Export for global access
window.PerformanceMonitor = PerformanceMonitor;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}