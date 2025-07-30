/**
 * High Leverage Humans - Main Application Controller
 * Coordinates all app modules and handles initialization
 */

class HighLeverageApp {
    constructor() {
        this.modules = new Map();
        this.isInitialized = false;
        this.performance = null;
        this.animations = null;
        this.forms = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        
        // Global error handler
        window.addEventListener('error', this.handleError);
        window.addEventListener('unhandledrejection', this.handleError);
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('🚀 Initializing High Leverage Humans App');
            
            // Initialize performance monitoring first
            await this.initializePerformance();
            
            // Initialize core modules
            await this.initializeAnimations();
            await this.initializeForms();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize service worker
            await this.initializeServiceWorker();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Trigger app ready event
            this.dispatchEvent('app:ready');
            
            console.log('✅ High Leverage Humans App initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.handleError(error);
        }
    }

    /**
     * Initialize performance monitoring
     */
    async initializePerformance() {
        try {
            if (window.PerformanceMonitor) {
                this.performance = new PerformanceMonitor();
                await this.performance.init();
                this.modules.set('performance', this.performance);
            }
        } catch (error) {
            console.warn('Performance monitoring failed to initialize:', error);
        }
    }

    /**
     * Initialize animations module
     */
    async initializeAnimations() {
        try {
            if (window.AnimationController) {
                this.animations = new AnimationController();
                await this.animations.init();
                this.modules.set('animations', this.animations);
            }
        } catch (error) {
            console.warn('Animations failed to initialize:', error);
        }
    }

    /**
     * Initialize forms module
     */
    async initializeForms() {
        try {
            if (window.FormController) {
                this.forms = new FormController();
                await this.forms.init();
                this.modules.set('forms', this.forms);
            }
        } catch (error) {
            console.warn('Forms failed to initialize:', error);
        }
    }

    /**
     * Initialize service worker
     */
    async initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js', {
                    scope: '/'
                });
                
                console.log('✅ Service Worker registered:', registration);
                
                // Handle service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
                
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Resize handler with throttling
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(this.handleResize, 150);
        });

        // Visibility change handler
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Keyboard navigation
        document.addEventListener('keydown', this.handleKeydown.bind(this));

        // Touch gesture support
        this.setupTouchGestures();

        // Intersection observer for scroll animations
        this.setupScrollAnimations();
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const event = new CustomEvent('app:resize', {
            detail: {
                width: window.innerWidth,
                height: window.innerHeight,
                isMobile: window.innerWidth < 768
            }
        });
        
        document.dispatchEvent(event);
        
        // Notify modules
        this.modules.forEach(module => {
            if (module.handleResize) {
                module.handleResize();
            }
        });
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        const isVisible = !document.hidden;
        
        this.modules.forEach(module => {
            if (module.handleVisibilityChange) {
                module.handleVisibilityChange(isVisible);
            }
        });

        // Pause/resume animations based on visibility
        if (this.animations) {
            if (isVisible) {
                this.animations.resume();
            } else {
                this.animations.pause();
            }
        }
    }

    /**
     * Handle keyboard navigation
     */
    handleKeydown(event) {
        // Escape key handling
        if (event.key === 'Escape') {
            this.dispatchEvent('app:escape');
        }
        
        // Focus management
        if (event.key === 'Tab') {
            this.manageFocus(event);
        }
    }

    /**
     * Setup touch gesture support
     */
    setupTouchGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // Detect swipe gestures
            const minSwipeDistance = 50;
            
            if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
                const direction = Math.abs(deltaX) > Math.abs(deltaY) 
                    ? (deltaX > 0 ? 'right' : 'left')
                    : (deltaY > 0 ? 'down' : 'up');
                
                this.dispatchEvent('app:swipe', { direction, deltaX, deltaY });
            }
            
            touchStartX = 0;
            touchStartY = 0;
        }, { passive: true });
    }

    /**
     * Setup scroll animations with Intersection Observer
     */
    setupScrollAnimations() {
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -10% 0px',
            threshold: [0, 0.1, 0.5, 1]
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const element = entry.target;
                const ratio = entry.intersectionRatio;
                
                // Add visibility classes
                if (entry.isIntersecting) {
                    element.classList.add('is-visible');
                    element.classList.remove('is-hidden');
                } else {
                    element.classList.add('is-hidden');
                    element.classList.remove('is-visible');
                }
                
                // Trigger custom event for modules
                this.dispatchEvent('app:scroll-intersect', {
                    element,
                    isIntersecting: entry.isIntersecting,
                    ratio
                });
            });
        }, observerOptions);

        // Observe elements with scroll animations
        document.querySelectorAll('[data-animate-on-scroll]').forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * Focus management for accessibility
     */
    manageFocus(event) {
        const focusableElements = document.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
        );
        
        const focusedIndex = Array.from(focusableElements).indexOf(document.activeElement);
        
        if (event.shiftKey && focusedIndex === 0) {
            event.preventDefault();
            focusableElements[focusableElements.length - 1].focus();
        } else if (!event.shiftKey && focusedIndex === focusableElements.length - 1) {
            event.preventDefault();
            focusableElements[0].focus();
        }
    }

    /**
     * Show update notification
     */
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <span>A new version is available!</span>
                <button onclick="window.location.reload()" class="update-btn">Update</button>
                <button onclick="this.parentElement.parentElement.remove()" class="dismiss-btn">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Global error handler
     */
    handleError(error) {
        console.error('App Error:', error);
        
        // Track error if performance monitoring is available
        if (this.performance) {
            this.performance.trackError(error);
        }
        
        // Graceful degradation
        this.dispatchEvent('app:error', { error });
    }

    /**
     * Get module by name
     */
    getModule(name) {
        return this.modules.get(name);
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.modules.forEach(module => {
            if (module.destroy) {
                module.destroy();
            }
        });
        
        this.modules.clear();
        this.isInitialized = false;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.HighLeverageApp = new HighLeverageApp();
        window.HighLeverageApp.init();
    });
} else {
    window.HighLeverageApp = new HighLeverageApp();
    window.HighLeverageApp.init();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HighLeverageApp;
}