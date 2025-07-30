/**
 * High Leverage Humans - Animation Controller
 * Handles custom animations, particle systems, and visual effects
 */

class AnimationController {
    constructor() {
        this.animations = new Map();
        this.particles = new Map();
        this.observers = new Map();
        this.rafId = null;
        this.isPaused = false;
        this.performance = {
            fps: 60,
            lastTime: 0,
            frameCount: 0
        };
        
        // Configuration
        this.config = {
            particleCount: 50,
            particleSpeed: 0.5,
            glitchIntensity: 0.3,
            animationDuration: 1000,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            reducedMotion: false
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.animate = this.animate.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }

    /**
     * Initialize animation controller
     */
    async init() {
        try {
            console.log('✨ Initializing Animation Controller');
            
            // Check for reduced motion preference
            this.checkReducedMotion();
            
            // Initialize particle systems
            this.initializeParticles();
            
            // Initialize scroll animations
            this.initializeScrollAnimations();
            
            // Initialize hover effects
            this.initializeHoverEffects();
            
            // Initialize glitch effects
            this.initializeGlitchEffects();
            
            // Start animation loop
            this.startAnimationLoop();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('✅ Animation Controller initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Animation Controller:', error);
            throw error;
        }
    }

    /**
     * Check for reduced motion preference
     */
    checkReducedMotion() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.config.reducedMotion = prefersReducedMotion.matches;
        
        prefersReducedMotion.addEventListener('change', (e) => {
            this.config.reducedMotion = e.matches;
            if (e.matches) {
                this.pauseAllAnimations();
            } else {
                this.resumeAllAnimations();
            }
        });
    }

    /**
     * Initialize particle systems
     */
    initializeParticles() {
        const particleContainers = document.querySelectorAll('[data-particles]');
        
        particleContainers.forEach(container => {
            const particleSystem = new ParticleSystem(container, {
                count: parseInt(container.dataset.particleCount) || this.config.particleCount,
                speed: parseFloat(container.dataset.particleSpeed) || this.config.particleSpeed,
                color: container.dataset.particleColor || '#ffffff',
                size: parseFloat(container.dataset.particleSize) || 1,
                type: container.dataset.particleType || 'dots'
            });
            
            this.particles.set(container.id || `particle_${Date.now()}`, particleSystem);
        });
    }

    /**
     * Initialize scroll animations
     */
    initializeScrollAnimations() {
        const animatedElements = document.querySelectorAll('[data-animate]');
        
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -10% 0px',
            threshold: [0, 0.25, 0.5, 0.75, 1]
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const element = entry.target;
                const animationType = element.dataset.animate;
                const delay = parseInt(element.dataset.animateDelay) || 0;
                const duration = parseInt(element.dataset.animateDuration) || this.config.animationDuration;
                
                if (entry.isIntersecting && !element.classList.contains('is-animated')) {
                    setTimeout(() => {
                        this.triggerAnimation(element, animationType, { duration });
                    }, delay);
                }
            });
        }, observerOptions);

        animatedElements.forEach(element => {
            observer.observe(element);
        });

        this.observers.set('scroll', observer);
    }

    /**
     * Initialize hover effects
     */
    initializeHoverEffects() {
        const hoverElements = document.querySelectorAll('[data-hover-effect]');
        
        hoverElements.forEach(element => {
            const effectType = element.dataset.hoverEffect;
            
            element.addEventListener('mouseenter', (e) => {
                this.triggerHoverEffect(element, effectType, 'enter', e);
            });
            
            element.addEventListener('mouseleave', (e) => {
                this.triggerHoverEffect(element, effectType, 'leave', e);
            });
            
            element.addEventListener('mousemove', (e) => {
                this.updateHoverEffect(element, effectType, e);
            });
        });
    }

    /**
     * Initialize glitch effects
     */
    initializeGlitchEffects() {
        const glitchElements = document.querySelectorAll('[data-glitch]');
        
        glitchElements.forEach(element => {
            const intensity = parseFloat(element.dataset.glitchIntensity) || this.config.glitchIntensity;
            const interval = parseInt(element.dataset.glitchInterval) || 3000;
            
            const glitchAnimation = new GlitchEffect(element, { intensity });
            
            // Trigger glitch periodically
            setInterval(() => {
                if (!this.config.reducedMotion && !this.isPaused) {
                    glitchAnimation.trigger();
                }
            }, interval + Math.random() * 2000);
            
            this.animations.set(`glitch_${element.id || Date.now()}`, glitchAnimation);
        });
    }

    /**
     * Start animation loop
     */
    startAnimationLoop() {
        const animate = (currentTime) => {
            if (this.isPaused) {
                this.rafId = requestAnimationFrame(animate);
                return;
            }
            
            // Calculate delta time
            const deltaTime = currentTime - this.performance.lastTime;
            this.performance.lastTime = currentTime;
            
            // Update FPS
            this.updateFPS(deltaTime);
            
            // Update particles
            this.particles.forEach(particleSystem => {
                particleSystem.update(deltaTime);
            });
            
            // Update custom animations
            this.animations.forEach(animation => {
                if (animation.update) {
                    animation.update(deltaTime);
                }
            });
            
            this.rafId = requestAnimationFrame(animate);
        };
        
        this.rafId = requestAnimationFrame(animate);
    }

    /**
     * Update FPS calculation
     */
    updateFPS(deltaTime) {
        this.performance.frameCount++;
        
        if (this.performance.frameCount % 60 === 0) {
            this.performance.fps = 1000 / deltaTime;
            
            // Adjust particle count based on performance
            if (this.performance.fps < 30) {
                this.reduceParticleCount();
            } else if (this.performance.fps > 55) {
                this.increaseParticleCount();
            }
        }
    }

    /**
     * Trigger animation
     */
    triggerAnimation(element, type, options = {}) {
        if (this.config.reducedMotion) {
            element.classList.add('is-animated');
            return;
        }
        
        const animation = this.createAnimation(element, type, options);
        animation.play();
        
        element.classList.add('is-animated');
    }

    /**
     * Create animation
     */
    createAnimation(element, type, options) {
        const defaultOptions = {
            duration: this.config.animationDuration,
            easing: this.config.easing,
            fill: 'both'
        };
        
        const animationOptions = { ...defaultOptions, ...options };
        
        let keyframes;
        
        switch (type) {
            case 'fadeIn':
                keyframes = [
                    { opacity: 0, transform: 'translateY(20px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ];
                break;
                
            case 'slideInLeft':
                keyframes = [
                    { opacity: 0, transform: 'translateX(-50px)' },
                    { opacity: 1, transform: 'translateX(0)' }
                ];
                break;
                
            case 'slideInRight':
                keyframes = [
                    { opacity: 0, transform: 'translateX(50px)' },
                    { opacity: 1, transform: 'translateX(0)' }
                ];
                break;
                
            case 'scaleIn':
                keyframes = [
                    { opacity: 0, transform: 'scale(0.8)' },
                    { opacity: 1, transform: 'scale(1)' }
                ];
                break;
                
            case 'rotateIn':
                keyframes = [
                    { opacity: 0, transform: 'rotate(-10deg) scale(0.9)' },
                    { opacity: 1, transform: 'rotate(0deg) scale(1)' }
                ];
                break;
                
            default:
                keyframes = [
                    { opacity: 0 },
                    { opacity: 1 }
                ];
        }
        
        return element.animate(keyframes, animationOptions);
    }

    /**
     * Trigger hover effect
     */
    triggerHoverEffect(element, type, phase, event) {
        if (this.config.reducedMotion) return;
        
        switch (type) {
            case 'glow':
                this.triggerGlowEffect(element, phase);
                break;
                
            case 'lift':
                this.triggerLiftEffect(element, phase);
                break;
                
            case 'tilt':
                this.triggerTiltEffect(element, phase, event);
                break;
                
            case 'magnetic':
                this.triggerMagneticEffect(element, phase, event);
                break;
        }
    }

    /**
     * Update hover effect
     */
    updateHoverEffect(element, type, event) {
        if (this.config.reducedMotion) return;
        
        switch (type) {
            case 'tilt':
                this.updateTiltEffect(element, event);
                break;
                
            case 'magnetic':
                this.updateMagneticEffect(element, event);
                break;
        }
    }

    /**
     * Trigger glow effect
     */
    triggerGlowEffect(element, phase) {
        const intensity = phase === 'enter' ? 1 : 0;
        
        element.animate([
            { filter: `drop-shadow(0 0 ${intensity * 20}px currentColor)` }
        ], {
            duration: 300,
            fill: 'forwards',
            easing: 'ease-out'
        });
    }

    /**
     * Trigger lift effect
     */
    triggerLiftEffect(element, phase) {
        const translateY = phase === 'enter' ? -5 : 0;
        const scale = phase === 'enter' ? 1.02 : 1;
        
        element.animate([
            { transform: `translateY(${translateY}px) scale(${scale})` }
        ], {
            duration: 200,
            fill: 'forwards',
            easing: 'ease-out'
        });
    }

    /**
     * Trigger tilt effect
     */
    triggerTiltEffect(element, phase, event) {
        if (phase === 'leave') {
            element.animate([
                { transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)' }
            ], {
                duration: 300,
                fill: 'forwards'
            });
        }
    }

    /**
     * Update tilt effect
     */
    updateTiltEffect(element, event) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = (event.clientX - centerX) / (rect.width / 2);
        const deltaY = (event.clientY - centerY) / (rect.height / 2);
        
        const rotateX = deltaY * -10;
        const rotateY = deltaX * 10;
        
        element.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    /**
     * Trigger magnetic effect
     */
    triggerMagneticEffect(element, phase, event) {
        if (phase === 'leave') {
            element.animate([
                { transform: 'translate(0, 0)' }
            ], {
                duration: 400,
                fill: 'forwards',
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
        }
    }

    /**
     * Update magnetic effect
     */
    updateMagneticEffect(element, event) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = (event.clientX - centerX) * 0.3;
        const deltaY = (event.clientY - centerY) * 0.3;
        
        element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }

    /**
     * Reduce particle count for performance
     */
    reduceParticleCount() {
        this.particles.forEach(particleSystem => {
            particleSystem.reduceCount(0.8);
        });
    }

    /**
     * Increase particle count
     */
    increaseParticleCount() {
        this.particles.forEach(particleSystem => {
            particleSystem.increaseCount(1.1);
        });
    }

    /**
     * Pause all animations
     */
    pauseAllAnimations() {
        this.isPaused = true;
        
        this.animations.forEach(animation => {
            if (animation.pause) {
                animation.pause();
            }
        });
        
        this.particles.forEach(particleSystem => {
            particleSystem.pause();
        });
    }

    /**
     * Resume all animations
     */
    resumeAllAnimations() {
        this.isPaused = false;
        
        this.animations.forEach(animation => {
            if (animation.resume) {
                animation.resume();
            }
        });
        
        this.particles.forEach(particleSystem => {
            particleSystem.resume();
        });
    }

    /**
     * Pause animations
     */
    pause() {
        this.pauseAllAnimations();
    }

    /**
     * Resume animations
     */
    resume() {
        this.resumeAllAnimations();
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange(isVisible) {
        if (isVisible) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * Handle resize
     */
    handleResize() {
        this.particles.forEach(particleSystem => {
            particleSystem.resize();
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle app events
        document.addEventListener('app:resize', () => {
            this.handleResize();
        });
    }

    /**
     * Destroy animation controller
     */
    destroy() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        
        this.animations.forEach(animation => {
            if (animation.destroy) {
                animation.destroy();
            }
        });
        
        this.particles.forEach(particleSystem => {
            particleSystem.destroy();
        });
        
        this.animations.clear();
        this.particles.clear();
        this.observers.clear();
    }
}

/**
 * Particle System Class
 */
class ParticleSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.isPaused = false;
        
        this.config = {
            count: options.count || 50,
            speed: options.speed || 0.5,
            color: options.color || '#ffffff',
            size: options.size || 1,
            type: options.type || 'dots'
        };
        
        this.init();
    }

    init() {
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'particle-canvas';
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.resize();
        
        // Create particles
        this.createParticles();
        
        // Add to container
        this.container.appendChild(this.canvas);
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    createParticles() {
        this.particles = [];
        
        for (let i = 0; i < this.config.count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * this.config.speed,
                vy: (Math.random() - 0.5) * this.config.speed,
                size: Math.random() * this.config.size + 0.5,
                opacity: Math.random() * 0.5 + 0.5
            });
        }
    }

    update() {
        if (this.isPaused) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and draw particles
        this.particles.forEach(particle => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Wrap around edges
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
            
            // Draw particle
            this.drawParticle(particle);
        });
    }

    drawParticle(particle) {
        this.ctx.save();
        this.ctx.globalAlpha = particle.opacity;
        this.ctx.fillStyle = this.config.color;
        
        switch (this.config.type) {
            case 'dots':
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                break;
                
            case 'lines':
                this.ctx.strokeStyle = this.config.color;
                this.ctx.lineWidth = particle.size;
                this.ctx.beginPath();
                this.ctx.moveTo(particle.x, particle.y);
                this.ctx.lineTo(particle.x + particle.vx * 10, particle.y + particle.vy * 10);
                this.ctx.stroke();
                break;
        }
        
        this.ctx.restore();
    }

    reduceCount(factor) {
        const newCount = Math.floor(this.config.count * factor);
        this.particles = this.particles.slice(0, newCount);
        this.config.count = newCount;
    }

    increaseCount(factor) {
        const newCount = Math.ceil(this.config.count * factor);
        const additionalCount = newCount - this.config.count;
        
        for (let i = 0; i < additionalCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * this.config.speed,
                vy: (Math.random() - 0.5) * this.config.speed,
                size: Math.random() * this.config.size + 0.5,
                opacity: Math.random() * 0.5 + 0.5
            });
        }
        
        this.config.count = newCount;
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    destroy() {
        if (this.canvas && this.canvas.parentElement) {
            this.canvas.remove();
        }
    }
}

/**
 * Glitch Effect Class
 */
class GlitchEffect {
    constructor(element, options = {}) {
        this.element = element;
        this.isActive = false;
        
        this.config = {
            intensity: options.intensity || 0.3,
            duration: options.duration || 200
        };
    }

    trigger() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        const originalText = this.element.textContent;
        const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        let iterations = 0;
        const maxIterations = 10;
        
        const glitchInterval = setInterval(() => {
            let glitchedText = '';
            
            for (let i = 0; i < originalText.length; i++) {
                if (Math.random() < this.config.intensity && originalText[i] !== ' ') {
                    glitchedText += glitchChars[Math.floor(Math.random() * glitchChars.length)];
                } else {
                    glitchedText += originalText[i];
                }
            }
            
            this.element.textContent = glitchedText;
            
            iterations++;
            if (iterations >= maxIterations) {
                this.element.textContent = originalText;
                this.isActive = false;
                clearInterval(glitchInterval);
            }
        }, this.config.duration / maxIterations);
    }
}

// Export for global access
window.AnimationController = AnimationController;
window.ParticleSystem = ParticleSystem;
window.GlitchEffect = GlitchEffect;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnimationController, ParticleSystem, GlitchEffect };
}