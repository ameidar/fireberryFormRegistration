/**
 * Rate Limiting and Request Management Utilities
 * Prevents 429 errors by implementing queuing, throttling, caching, and retry logic
 */

class RateLimiter {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 2; // Max concurrent requests to Fireberry API
    this.requestDelay = options.requestDelay || 250; // Minimum delay between requests (ms)
    this.maxRetries = options.maxRetries || 3;
    this.baseRetryDelay = options.baseRetryDelay || 1000; // Base delay for exponential backoff
    this.cacheTimeout = options.cacheTimeout || 60000; // Cache timeout (1 minute)
    
    this.activeRequests = 0;
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.cache = new Map();
    this.pendingRequests = new Map(); // Prevent duplicate concurrent requests
  }

  /**
   * Execute a request with rate limiting, queuing, and retry logic
   */
  async executeRequest(requestFn, cacheKey = null, priority = 0) {
    // Check cache first
    if (cacheKey && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`[RateLimiter] Cache hit for: ${cacheKey}`);
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // Prevent duplicate concurrent requests
    if (cacheKey && this.pendingRequests.has(cacheKey)) {
      console.log(`[RateLimiter] Waiting for existing request: ${cacheKey}`);
      return await this.pendingRequests.get(cacheKey);
    }

    // Create promise for request execution
    const requestPromise = this._queueRequest(requestFn, cacheKey, priority);
    
    if (cacheKey) {
      this.pendingRequests.set(cacheKey, requestPromise);
    }

    try {
      const result = await requestPromise;
      
      // Cache successful responses
      if (cacheKey && result) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }
      
      return result;
    } finally {
      if (cacheKey) {
        this.pendingRequests.delete(cacheKey);
      }
    }
  }

  /**
   * Queue a request for execution when resources are available
   */
  _queueRequest(requestFn, cacheKey, priority) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        requestFn,
        cacheKey,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Sort queue by priority (higher priority first)
      this.requestQueue.sort((a, b) => b.priority - a.priority);
      
      this._processQueue();
    });
  }

  /**
   * Process the request queue
   */
  async _processQueue() {
    if (this.activeRequests >= this.maxConcurrent || this.requestQueue.length === 0) {
      return;
    }

    // Ensure minimum delay between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      setTimeout(() => this._processQueue(), this.requestDelay - timeSinceLastRequest);
      return;
    }

    const queuedRequest = this.requestQueue.shift();
    if (!queuedRequest) return;

    this.activeRequests++;
    this.lastRequestTime = Date.now();

    try {
      const result = await this._executeWithRetry(queuedRequest.requestFn, queuedRequest.cacheKey);
      queuedRequest.resolve(result);
    } catch (error) {
      queuedRequest.reject(error);
    } finally {
      this.activeRequests--;
      // Process next request in queue
      setTimeout(() => this._processQueue(), this.requestDelay);
    }
  }

  /**
   * Execute request with exponential backoff retry logic
   */
  async _executeWithRetry(requestFn, cacheKey, attempt = 1) {
    try {
      console.log(`[RateLimiter] Executing request (attempt ${attempt}): ${cacheKey || 'unnamed'}`);
      return await requestFn();
    } catch (error) {
      console.error(`[RateLimiter] Request failed (attempt ${attempt}):`, error.message);

      // Check if this is a rate limiting error
      const is429Error = error.message.includes('429') || error.message.includes('Too Many Requests');
      const is5xxError = /5[0-9]{2}/.test(error.message); // Server errors
      
      if ((is429Error || is5xxError) && attempt < this.maxRetries) {
        // Calculate exponential backoff delay
        const delay = this.baseRetryDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.1 * delay; // Add random jitter
        const totalDelay = delay + jitter;

        console.log(`[RateLimiter] Retrying in ${Math.round(totalDelay)}ms...`);
        await this._sleep(totalDelay);
        
        return await this._executeWithRetry(requestFn, cacheKey, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Clear cache entries older than timeout
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[RateLimiter] Cache cleared');
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Circuit Breaker implementation
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.monitoringPeriod = options.monitoringPeriod || 60000; // 1 minute
    
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = 0;
    this.recentFailures = [];
  }

  async execute(requestFn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - API temporarily unavailable due to repeated failures');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await requestFn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      throw error;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    this.recentFailures = [];
    this.state = 'CLOSED';
  }

  _onFailure() {
    this.failureCount++;
    this.recentFailures.push(Date.now());
    
    // Remove old failures outside monitoring period
    const cutoff = Date.now() - this.monitoringPeriod;
    this.recentFailures = this.recentFailures.filter(time => time > cutoff);

    if (this.recentFailures.length >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.warn(`[CircuitBreaker] Circuit OPEN due to ${this.recentFailures.length} recent failures`);
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      recentFailures: this.recentFailures.length,
      nextAttempt: this.nextAttempt
    };
  }
}

// Export instances
const rateLimiter = new RateLimiter({
  maxConcurrent: 2,
  requestDelay: 300, // Reduced concurrent requests and added delay
  maxRetries: 3,
  baseRetryDelay: 1000,
  cacheTimeout: 60000 // 1 minute cache
});

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
  monitoringPeriod: 60000
});

// Periodic cache cleanup
setInterval(() => {
  rateLimiter.clearExpiredCache();
}, 30000); // Clean every 30 seconds

export { rateLimiter, circuitBreaker, RateLimiter, CircuitBreaker };