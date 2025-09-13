/**
 * Client-side Rate Limiting and Request Management Utilities
 * Prevents excessive API calls from the frontend
 */

class ClientRateLimiter {
  constructor(options = {}) {
    this.debounceDelay = options.debounceDelay || 300;
    this.maxRetries = options.maxRetries || 3;
    this.baseRetryDelay = options.baseRetryDelay || 1000;
    
    this.debounceTimers = new Map();
    this.activeRequests = new Set();
    this.requestCache = new Map();
    this.cacheTimeout = options.cacheTimeout || 30000; // 30 seconds for client cache
  }

  /**
   * Debounced API call to prevent rapid successive requests
   */
  debounce(key, fn, delay = this.debounceDelay) {
    return new Promise((resolve, reject) => {
      // Clear existing timer for this key
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key));
      }

      // Set new timer
      const timerId = setTimeout(async () => {
        this.debounceTimers.delete(key);
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);

      this.debounceTimers.set(key, timerId);
    });
  }

  /**
   * Execute request with caching and retry logic
   */
  async executeRequest(requestFn, cacheKey = null, options = {}) {
    // Check cache first
    if (cacheKey && this.requestCache.has(cacheKey)) {
      const cached = this.requestCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`[ClientRateLimiter] Cache hit for: ${cacheKey}`);
        return { ...cached.data, fromCache: true };
      } else {
        this.requestCache.delete(cacheKey);
      }
    }

    // Prevent duplicate requests
    if (cacheKey && this.activeRequests.has(cacheKey)) {
      console.log(`[ClientRateLimiter] Request already in progress: ${cacheKey}`);
      throw new Error('Request already in progress');
    }

    if (cacheKey) {
      this.activeRequests.add(cacheKey);
    }

    try {
      const result = await this._executeWithRetry(requestFn, options);
      
      // Cache successful responses
      if (cacheKey && result) {
        this.requestCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }
      
      return result;
    } finally {
      if (cacheKey) {
        this.activeRequests.delete(cacheKey);
      }
    }
  }

  /**
   * Execute with retry logic and exponential backoff
   */
  async _executeWithRetry(requestFn, options, attempt = 1) {
    try {
      console.log(`[ClientRateLimiter] Executing request (attempt ${attempt})`);
      return await requestFn();
    } catch (error) {
      console.error(`[ClientRateLimiter] Request failed (attempt ${attempt}):`, error.message);

      const shouldRetry = this._shouldRetry(error, attempt, options);
      
      if (shouldRetry && attempt < this.maxRetries) {
        const delay = this._calculateRetryDelay(attempt, error);
        console.log(`[ClientRateLimiter] Retrying in ${delay}ms...`);
        
        await this._sleep(delay);
        return await this._executeWithRetry(requestFn, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Determine if request should be retried
   */
  _shouldRetry(error, attempt, options) {
    // Don't retry if explicitly disabled
    if (options.noRetry) {
      return false;
    }

    // Retry on network errors, 5xx errors, and 429 errors
    const status = this._extractStatusFromError(error);
    return (
      !status || // Network error
      status === 429 || // Rate limited
      status >= 500 || // Server error
      error.message.includes('network') ||
      error.message.includes('timeout')
    );
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  _calculateRetryDelay(attempt, error) {
    const status = this._extractStatusFromError(error);
    
    // Special handling for rate limiting
    if (status === 429) {
      return Math.min(this.baseRetryDelay * Math.pow(2, attempt), 10000); // Max 10 seconds
    }

    // Regular exponential backoff with jitter
    const delay = this.baseRetryDelay * Math.pow(1.5, attempt - 1);
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, 5000); // Max 5 seconds
  }

  /**
   * Extract HTTP status code from error
   */
  _extractStatusFromError(error) {
    const message = error.message || '';
    const match = message.match(/(\d{3})/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Cancel all pending debounced requests
   */
  cancelAllDebounced() {
    for (const [key, timerId] of this.debounceTimers) {
      clearTimeout(timerId);
      this.debounceTimers.delete(key);
    }
    console.log('[ClientRateLimiter] All debounced requests cancelled');
  }

  /**
   * Clear client cache
   */
  clearCache() {
    this.requestCache.clear();
    console.log('[ClientRateLimiter] Client cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.requestCache.size,
      activeRequests: this.activeRequests.size,
      pendingDebounced: this.debounceTimers.size
    };
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Request cancellation utility
class RequestCancellation {
  constructor() {
    this.controllers = new Map();
  }

  /**
   * Create a cancellable fetch request
   */
  async fetch(url, options = {}, requestKey = null) {
    // Cancel existing request with same key
    if (requestKey && this.controllers.has(requestKey)) {
      this.controllers.get(requestKey).abort();
    }

    const controller = new AbortController();
    
    if (requestKey) {
      this.controllers.set(requestKey, controller);
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      if (requestKey) {
        this.controllers.delete(requestKey);
      }

      return response;
    } catch (error) {
      if (requestKey) {
        this.controllers.delete(requestKey);
      }

      if (error.name === 'AbortError') {
        console.log(`[RequestCancellation] Request cancelled: ${requestKey || url}`);
        throw new Error('Request cancelled');
      }

      throw error;
    }
  }

  /**
   * Cancel specific request
   */
  cancel(requestKey) {
    if (this.controllers.has(requestKey)) {
      this.controllers.get(requestKey).abort();
      this.controllers.delete(requestKey);
      console.log(`[RequestCancellation] Cancelled request: ${requestKey}`);
    }
  }

  /**
   * Cancel all active requests
   */
  cancelAll() {
    for (const [key, controller] of this.controllers) {
      controller.abort();
    }
    this.controllers.clear();
    console.log('[RequestCancellation] All requests cancelled');
  }
}

// Error handling utilities
class ErrorHandler {
  /**
   * Enhanced error display with user-friendly messages
   */
  static getDisplayMessage(error, context = '') {
    const message = error.message || error.toString();
    
    // Rate limiting errors
    if (message.includes('429') || message.includes('rate limit')) {
      return {
        message: 'הבקשות מגיעות מהר מדי. אנא המתן רגע ונסה שנית.',
        type: 'warning',
        showRetry: true,
        retryDelay: 5000
      };
    }

    // Circuit breaker errors
    if (message.includes('Circuit breaker is OPEN')) {
      return {
        message: 'השירות זמנית לא זמין עקב בעיות טכניות. אנא נסה שנית בעוד כמה רגעים.',
        type: 'error',
        showRetry: true,
        retryDelay: 10000
      };
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('Failed to fetch')) {
      return {
        message: 'בעיית התקשרות לשרת. אנא בדוק את החיבור לאינטרנט ונסה שנית.',
        type: 'error',
        showRetry: true,
        retryDelay: 3000
      };
    }

    // Server errors
    if (/5\d{2}/.test(message)) {
      return {
        message: 'שגיאת שרת זמנית. אנא נסה שנית בעוד כמה רגעים.',
        type: 'error',
        showRetry: true,
        retryDelay: 5000
      };
    }

    // Request cancelled
    if (message.includes('cancelled') || message.includes('aborted')) {
      return {
        message: 'הבקשה בוטלה.',
        type: 'info',
        showRetry: false
      };
    }

    // Generic error
    return {
      message: context ? `שגיאה ב${context}: ${message}` : `שגיאה: ${message}`,
      type: 'error',
      showRetry: true,
      retryDelay: 3000
    };
  }

  /**
   * Display error with enhanced UI feedback
   */
  static displayError(element, error, context = '') {
    const errorInfo = this.getDisplayMessage(error, context);
    
    element.innerHTML = `
      <div class="error-message ${errorInfo.type}" style="
        padding: 15px;
        border-radius: 8px;
        margin: 10px 0;
        text-align: center;
        font-weight: bold;
        ${this._getErrorStyles(errorInfo.type)}
      ">
        <div class="error-icon">${this._getErrorIcon(errorInfo.type)}</div>
        <div class="error-text">${errorInfo.message}</div>
        ${errorInfo.showRetry ? `
          <button class="retry-btn" onclick="this.closest('.error-message').dispatchEvent(new CustomEvent('retry'))" style="
            margin-top: 10px;
            padding: 8px 16px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">
            נסה שנית
          </button>
        ` : ''}
      </div>
    `;

    // Auto-hide info messages
    if (errorInfo.type === 'info') {
      setTimeout(() => {
        if (element.querySelector('.error-message.info')) {
          element.innerHTML = '';
        }
      }, 3000);
    }
  }

  static _getErrorStyles(type) {
    switch (type) {
      case 'warning':
        return 'background: #fff3cd; border: 1px solid #ffeaa7; color: #856404;';
      case 'error':
        return 'background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24;';
      case 'info':
        return 'background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460;';
      default:
        return 'background: #f8f9fa; border: 1px solid #dee2e6; color: #495057;';
    }
  }

  static _getErrorIcon(type) {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '🔔';
    }
  }
}

// Export instances and classes
window.clientRateLimiter = new ClientRateLimiter();
window.requestCancellation = new RequestCancellation();
window.ErrorHandler = ErrorHandler;