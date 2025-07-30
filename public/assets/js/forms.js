/**
 * High Leverage Humans - Form Controller
 * Handles email capture, validation, and submission
 */

class FormController {
    constructor() {
        this.forms = new Map();
        this.validators = new Map();
        this.isSubmitting = false;
        this.config = {
            apiEndpoint: '/api/subscribe', // Configure your endpoint
            firebaseConfig: null, // Will be set from external config
            animationDuration: 300,
            debounceDelay: 300
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.validateField = this.validateField.bind(this);
        this.validateForm = this.validateForm.bind(this);
    }

    /**
     * Initialize form controller
     */
    async init() {
        try {
            console.log('📝 Initializing Form Controller');
            
            // Setup validators
            this.setupValidators();
            
            // Find and initialize all forms
            this.initializeForms();
            
            // Setup global form event listeners
            this.setupEventListeners();
            
            console.log('✅ Form Controller initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Form Controller:', error);
            throw error;
        }
    }

    /**
     * Setup form validators
     */
    setupValidators() {
        // Email validator
        this.validators.set('email', {
            validate: (value) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            },
            message: 'Please enter a valid email address'
        });

        // Required field validator
        this.validators.set('required', {
            validate: (value) => {
                return value && value.trim().length > 0;
            },
            message: 'This field is required'
        });

        // Name validator
        this.validators.set('name', {
            validate: (value) => {
                return value && value.trim().length >= 2;
            },
            message: 'Name must be at least 2 characters long'
        });

        // Phone validator
        this.validators.set('phone', {
            validate: (value) => {
                const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
                return !value || phoneRegex.test(value);
            },
            message: 'Please enter a valid phone number'
        });
    }

    /**
     * Initialize all forms on the page
     */
    initializeForms() {
        const forms = document.querySelectorAll('form[data-form-type]');
        
        forms.forEach(form => {
            const formType = form.dataset.formType;
            const formId = form.id || `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            if (!form.id) {
                form.id = formId;
            }
            
            this.initializeForm(form, formType);
        });
    }

    /**
     * Initialize a single form
     */
    initializeForm(form, formType) {
        const formConfig = {
            element: form,
            type: formType,
            fields: new Map(),
            isValid: false,
            submitButton: form.querySelector('[type="submit"]'),
            loadingState: false
        };

        // Initialize form fields
        const fields = form.querySelectorAll('input, textarea, select');
        fields.forEach(field => {
            this.initializeField(field, formConfig);
        });

        // Setup form submission
        form.addEventListener('submit', (e) => this.handleSubmit(e, formConfig));

        // Store form configuration
        this.forms.set(form.id, formConfig);

        // Add accessibility attributes
        this.enhanceAccessibility(form);
    }

    /**
     * Initialize a form field
     */
    initializeField(field, formConfig) {
        const fieldName = field.name || field.id;
        const validators = (field.dataset.validators || '').split(',').filter(v => v.trim());
        
        const fieldConfig = {
            element: field,
            name: fieldName,
            validators,
            isValid: false,
            errorElement: null,
            originalValue: field.value
        };

        // Create error display element
        this.createErrorElement(field, fieldConfig);

        // Setup field validation
        this.setupFieldValidation(field, fieldConfig, formConfig);

        // Store field configuration
        formConfig.fields.set(fieldName, fieldConfig);
    }

    /**
     * Create error display element for field
     */
    createErrorElement(field, fieldConfig) {
        const errorId = `${field.id || field.name}_error`;
        let errorElement = document.getElementById(errorId);
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = errorId;
            errorElement.className = 'field-error';
            errorElement.setAttribute('role', 'alert');
            errorElement.setAttribute('aria-live', 'polite');
            
            // Insert after field or field container
            const container = field.closest('.field-container') || field.parentElement;
            container.appendChild(errorElement);
        }
        
        fieldConfig.errorElement = errorElement;
        field.setAttribute('aria-describedby', errorId);
    }

    /**
     * Setup field validation
     */
    setupFieldValidation(field, fieldConfig, formConfig) {
        let validationTimeout;

        const debouncedValidation = () => {
            clearTimeout(validationTimeout);
            validationTimeout = setTimeout(() => {
                this.validateField(fieldConfig);
                this.updateFormValidation(formConfig);
            }, this.config.debounceDelay);
        };

        // Real-time validation
        field.addEventListener('input', debouncedValidation);
        field.addEventListener('blur', () => {
            this.validateField(fieldConfig);
            this.updateFormValidation(formConfig);
        });

        // Enhanced UX
        field.addEventListener('focus', () => {
            field.classList.add('is-focused');
            this.clearFieldError(fieldConfig);
        });

        field.addEventListener('blur', () => {
            field.classList.remove('is-focused');
        });
    }

    /**
     * Validate a single field
     */
    validateField(fieldConfig) {
        const { element, validators, errorElement } = fieldConfig;
        const value = element.value.trim();
        
        let isValid = true;
        let errorMessage = '';

        // Run validators
        for (const validatorName of validators) {
            const validator = this.validators.get(validatorName.trim());
            if (validator && !validator.validate(value)) {
                isValid = false;
                errorMessage = validator.message;
                break;
            }
        }

        // Update field state
        fieldConfig.isValid = isValid;
        
        if (isValid) {
            element.classList.remove('is-invalid');
            element.classList.add('is-valid');
            this.clearFieldError(fieldConfig);
        } else {
            element.classList.remove('is-valid');
            element.classList.add('is-invalid');
            this.showFieldError(fieldConfig, errorMessage);
        }

        return isValid;
    }

    /**
     * Show field error
     */
    showFieldError(fieldConfig, message) {
        const { errorElement } = fieldConfig;
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('is-visible');
        }
    }

    /**
     * Clear field error
     */
    clearFieldError(fieldConfig) {
        const { errorElement } = fieldConfig;
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('is-visible');
        }
    }

    /**
     * Update form validation state
     */
    updateFormValidation(formConfig) {
        const allFieldsValid = Array.from(formConfig.fields.values())
            .every(field => field.isValid || field.validators.length === 0);
        
        formConfig.isValid = allFieldsValid;
        
        // Update submit button state
        if (formConfig.submitButton) {
            formConfig.submitButton.disabled = !allFieldsValid || formConfig.loadingState;
            formConfig.submitButton.classList.toggle('is-disabled', !allFieldsValid);
        }
    }

    /**
     * Validate entire form
     */
    validateForm(formConfig) {
        let isValid = true;
        
        formConfig.fields.forEach(fieldConfig => {
            if (!this.validateField(fieldConfig)) {
                isValid = false;
            }
        });
        
        formConfig.isValid = isValid;
        return isValid;
    }

    /**
     * Handle form submission
     */
    async handleSubmit(event, formConfig) {
        event.preventDefault();
        
        if (this.isSubmitting || formConfig.loadingState) {
            return;
        }

        // Validate form
        if (!this.validateForm(formConfig)) {
            this.focusFirstInvalidField(formConfig);
            return;
        }

        try {
            // Set loading state
            this.setFormLoadingState(formConfig, true);
            
            // Collect form data
            const formData = this.collectFormData(formConfig);
            
            // Submit form
            const result = await this.submitForm(formData, formConfig);
            
            // Handle success
            await this.handleSubmissionSuccess(result, formConfig);
            
        } catch (error) {
            console.error('Form submission error:', error);
            await this.handleSubmissionError(error, formConfig);
        } finally {
            this.setFormLoadingState(formConfig, false);
        }
    }

    /**
     * Set form loading state
     */
    setFormLoadingState(formConfig, isLoading) {
        formConfig.loadingState = isLoading;
        this.isSubmitting = isLoading;
        
        const { element, submitButton } = formConfig;
        
        element.classList.toggle('is-loading', isLoading);
        
        if (submitButton) {
            submitButton.disabled = isLoading;
            submitButton.classList.toggle('is-loading', isLoading);
            
            const originalText = submitButton.dataset.originalText || submitButton.textContent;
            if (!submitButton.dataset.originalText) {
                submitButton.dataset.originalText = originalText;
            }
            
            submitButton.textContent = isLoading ? 'Submitting...' : originalText;
        }
    }

    /**
     * Collect form data
     */
    collectFormData(formConfig) {
        const data = {};
        const formData = new FormData(formConfig.element);
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Add metadata
        data._metadata = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            url: window.location.href,
            formType: formConfig.type
        };
        
        return data;
    }

    /**
     * Submit form data
     */
    async submitForm(data, formConfig) {
        // Try Firebase first if configured
        if (this.config.firebaseConfig) {
            try {
                return await this.submitToFirebase(data, formConfig);
            } catch (error) {
                console.warn('Firebase submission failed, falling back to API:', error);
            }
        }
        
        // Fallback to API endpoint
        return await this.submitToAPI(data, formConfig);
    }

    /**
     * Submit to Firebase
     */
    async submitToFirebase(data, formConfig) {
        // Implementation would depend on Firebase configuration
        // This is a placeholder for Firebase integration
        throw new Error('Firebase not configured');
    }

    /**
     * Submit to API endpoint
     */
    async submitToAPI(data, formConfig) {
        const response = await fetch(this.config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Handle successful submission
     */
    async handleSubmissionSuccess(result, formConfig) {
        // Show success message
        this.showSuccessMessage(formConfig);
        
        // Track successful submission
        this.trackFormSubmission(formConfig, 'success');
        
        // Reset form if configured
        if (formConfig.element.dataset.resetOnSuccess !== 'false') {
            setTimeout(() => {
                this.resetForm(formConfig);
            }, 2000);
        }
        
        // Dispatch success event
        const event = new CustomEvent('form:success', {
            detail: { result, formConfig }
        });
        document.dispatchEvent(event);
    }

    /**
     * Handle submission error
     */
    async handleSubmissionError(error, formConfig) {
        // Show error message
        this.showErrorMessage(formConfig, error.message);
        
        // Track error
        this.trackFormSubmission(formConfig, 'error', error);
        
        // Dispatch error event
        const event = new CustomEvent('form:error', {
            detail: { error, formConfig }
        });
        document.dispatchEvent(event);
    }

    /**
     * Show success message
     */
    showSuccessMessage(formConfig) {
        const message = this.createMessage('Thank you! We\'ll be in touch soon.', 'success');
        this.displayMessage(formConfig, message);
    }

    /**
     * Show error message
     */
    showErrorMessage(formConfig, errorText = 'Something went wrong. Please try again.') {
        const message = this.createMessage(errorText, 'error');
        this.displayMessage(formConfig, message);
    }

    /**
     * Create message element
     */
    createMessage(text, type) {
        const message = document.createElement('div');
        message.className = `form-message form-message--${type}`;
        message.setAttribute('role', 'alert');
        message.textContent = text;
        return message;
    }

    /**
     * Display message
     */
    displayMessage(formConfig, messageElement) {
        // Remove existing messages
        const existingMessages = formConfig.element.querySelectorAll('.form-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Add new message
        formConfig.element.appendChild(messageElement);
        
        // Animate in
        requestAnimationFrame(() => {
            messageElement.classList.add('is-visible');
        });
        
        // Auto-remove after delay
        setTimeout(() => {
            if (messageElement.parentElement) {
                messageElement.classList.remove('is-visible');
                setTimeout(() => messageElement.remove(), this.config.animationDuration);
            }
        }, 5000);
    }

    /**
     * Reset form
     */
    resetForm(formConfig) {
        formConfig.element.reset();
        
        // Clear validation states
        formConfig.fields.forEach(fieldConfig => {
            fieldConfig.element.classList.remove('is-valid', 'is-invalid');
            this.clearFieldError(fieldConfig);
            fieldConfig.isValid = false;
        });
        
        // Update form validation
        this.updateFormValidation(formConfig);
    }

    /**
     * Focus first invalid field
     */
    focusFirstInvalidField(formConfig) {
        const firstInvalidField = Array.from(formConfig.fields.values())
            .find(field => !field.isValid);
        
        if (firstInvalidField) {
            firstInvalidField.element.focus();
            firstInvalidField.element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    /**
     * Enhance form accessibility
     */
    enhanceAccessibility(form) {
        // Add form role if not present
        if (!form.getAttribute('role')) {
            form.setAttribute('role', 'form');
        }
        
        // Add labels for fields without them
        const fields = form.querySelectorAll('input, textarea, select');
        fields.forEach(field => {
            if (!field.getAttribute('aria-label') && !field.labels?.length) {
                const placeholder = field.getAttribute('placeholder');
                if (placeholder) {
                    field.setAttribute('aria-label', placeholder);
                }
            }
        });
    }

    /**
     * Track form submission
     */
    trackFormSubmission(formConfig, status, error = null) {
        // Google Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'form_submit', {
                event_category: 'Forms',
                event_label: formConfig.type,
                value: status === 'success' ? 1 : 0
            });
        }
        
        // Custom tracking
        if (window.HighLeverageApp) {
            const performanceModule = window.HighLeverageApp.getModule('performance');
            if (performanceModule) {
                performanceModule.trackEvent('form_submission', {
                    formType: formConfig.type,
                    status,
                    error: error?.message
                });
            }
        }
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Handle app resize
        document.addEventListener('app:resize', () => {
            this.handleResize();
        });
        
        // Handle escape key
        document.addEventListener('app:escape', () => {
            this.handleEscape();
        });
    }

    /**
     * Handle resize
     */
    handleResize() {
        // Adjust form layouts for mobile
        this.forms.forEach(formConfig => {
            const isMobile = window.innerWidth < 768;
            formConfig.element.classList.toggle('is-mobile', isMobile);
        });
    }

    /**
     * Handle escape key
     */
    handleEscape() {
        // Clear form messages
        document.querySelectorAll('.form-message').forEach(message => {
            message.remove();
        });
    }

    /**
     * Destroy form controller
     */
    destroy() {
        this.forms.clear();
        this.validators.clear();
    }
}

// Export for global access
window.FormController = FormController;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormController;
}