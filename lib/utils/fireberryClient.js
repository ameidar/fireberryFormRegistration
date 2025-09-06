/**
 * Reusable Fireberry API Client with error handling, caching, and performance optimizations
 */

const { QueryHelpers } = require('./queryBuilder');

class FireberryAPIError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'FireberryAPIError';
    this.status = status;
    this.response = response;
  }
}

class FireberryClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.fireberry.com/api';
    this.timeout = options.timeout || 30000; // 30 seconds
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second
    
    // Simple in-memory cache (in production, consider Redis)
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
  }

  /**
   * Generate cache key for request
   * @param {string} endpoint - API endpoint
   * @param {object} payload - Request payload
   * @returns {string} - Cache key
   */
  _getCacheKey(endpoint, payload) {
    return `${endpoint}:${JSON.stringify(payload)}`;
  }

  /**
   * Get cached response if available and not expired
   * @param {string} key - Cache key
   * @returns {object|null} - Cached response or null
   */
  _getCachedResponse(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    return null;
  }

  /**
   * Cache response
   * @param {string} key - Cache key
   * @param {object} data - Data to cache
   */
  _setCachedResponse(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache entries (useful for data mutations)
   * @param {string} pattern - Pattern to match for cache clearing
   */
  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make HTTP request with retries and error handling
   * @param {string} endpoint - API endpoint
   * @param {object} options - Request options
   * @param {number} attempt - Current attempt number
   * @returns {Promise<object>} - API response
   */
  async _makeRequest(endpoint, options, attempt = 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'tokenid': this.apiKey,
          'accept': 'application/json',
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          // Use the raw text if JSON parsing fails
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new FireberryAPIError(errorMessage, response.status, errorText);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle network errors and timeouts
      if (error.name === 'AbortError') {
        throw new FireberryAPIError('Request timeout', 408, null);
      }
      
      if (error instanceof FireberryAPIError) {
        throw error;
      }
      
      // Retry on network errors
      if (attempt < this.maxRetries && 
          (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
        console.warn(`Fireberry API request failed, retrying (${attempt}/${this.maxRetries}):`, error.message);
        await this._sleep(this.retryDelay * attempt);
        return this._makeRequest(endpoint, options, attempt + 1);
      }
      
      throw new FireberryAPIError(`Network error: ${error.message}`, 500, null);
    }
  }

  /**
   * Query records with caching
   * @param {object} queryPayload - Query payload
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<object>} - Query results
   */
  async query(queryPayload, useCache = true) {
    const cacheKey = this._getCacheKey('/query', queryPayload);
    
    if (useCache) {
      const cached = this._getCachedResponse(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const result = await this._makeRequest('/query', {
      method: 'POST',
      body: JSON.stringify(queryPayload)
    });
    
    if (useCache && result.data && result.data.Data) {
      this._setCachedResponse(cacheKey, result);
    }
    
    return result;
  }

  /**
   * Create a new record
   * @param {number} objectType - Object type ID
   * @param {object} payload - Record data
   * @returns {Promise<object>} - Created record
   */
  async createRecord(objectType, payload) {
    // Clear relevant cache entries
    this.clearCache(`/query:{"objecttype":${objectType}`);
    
    return this._makeRequest(`/record/${objectType}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Update an existing record
   * @param {number} objectType - Object type ID
   * @param {string} recordId - Record ID
   * @param {object} payload - Updated record data
   * @returns {Promise<object>} - Updated record
   */
  async updateRecord(objectType, recordId, payload) {
    // Clear relevant cache entries
    this.clearCache(`/query:{"objecttype":${objectType}`);
    this.clearCache(recordId);
    
    return this._makeRequest(`/record/${objectType}/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Get a specific record
   * @param {number} objectType - Object type ID
   * @param {string} recordId - Record ID
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<object>} - Record data
   */
  async getRecord(objectType, recordId, useCache = true) {
    const cacheKey = this._getCacheKey(`/record/${objectType}/${recordId}`, {});
    
    if (useCache) {
      const cached = this._getCachedResponse(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const result = await this._makeRequest(`/record/${objectType}/${recordId}`, {
      method: 'GET'
    });
    
    if (useCache) {
      this._setCachedResponse(cacheKey, result);
    }
    
    return result;
  }

  /**
   * Find customer by email or phone (optimized lookup)
   * @param {string} email - Email address
   * @param {string} phoneNumber - Phone number
   * @returns {Promise<object|null>} - Customer data or null
   */
  async findCustomer(email, phoneNumber) {
    try {
      // Try email first if provided
      if (email) {
        const emailQuery = {
          objecttype: 1,
          page_size: 1,
          fields: "accountid,accountname,emailaddress1,telephone1",
          query: QueryHelpers.emailLookup(email)
        };
        
        const emailResult = await this.query(emailQuery, true);
        if (emailResult.data && emailResult.data.Data && emailResult.data.Data.length > 0) {
          return emailResult.data.Data[0];
        }
      }
      
      // Try phone number
      const phoneQuery = {
        objecttype: 1,
        page_size: 1,
        fields: "accountid,accountname,emailaddress1,telephone1",
        query: QueryHelpers.phoneLookup(phoneNumber)
      };
      
      const phoneResult = await this.query(phoneQuery, true);
      if (phoneResult.data && phoneResult.data.Data && phoneResult.data.Data.length > 0) {
        return phoneResult.data.Data[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error finding customer:', error);
      throw error;
    }
  }

  /**
   * Get multiple customers by account IDs (batch lookup)
   * @param {Array<string>} accountIds - Array of account IDs
   * @returns {Promise<Array>} - Array of customer data
   */
  async getCustomersBatch(accountIds) {
    if (!accountIds || accountIds.length === 0) {
      return [];
    }
    
    const query = {
      objecttype: 1,
      page_size: 500,
      fields: "accountid,accountname,telephone1,emailaddress1",
      query: QueryHelpers.multipleAccountsLookup(accountIds)
    };
    
    const result = await this.query(query, true);
    return result.data && result.data.Data ? result.data.Data : [];
  }

  /**
   * Get registrations for specific cycles (batch lookup)
   * @param {Array<string>} cycleIds - Array of cycle IDs
   * @returns {Promise<Array>} - Array of registration data
   */
  async getRegistrationsBatch(cycleIds) {
    if (!cycleIds || cycleIds.length === 0) {
      return [];
    }
    
    const query = {
      objecttype: 33,
      page_size: 2000,
      fields: "accountproductid,accountid,pcfsystemfield204,pcfsystemfield53,statuscode,pcfsystemfield56,pcfsystemfield289,pcfsystemfield298",
      query: QueryHelpers.multipleCyclesLookup(cycleIds)
    };
    
    const result = await this.query(query, false); // Don't cache large result sets
    return result.data && result.data.Data ? result.data.Data : [];
  }

  /**
   * Get active cycles
   * @returns {Promise<Array>} - Array of active cycles
   */
  async getActiveCycles() {
    const query = {
      objecttype: 1000,
      page_size: 500,
      fields: "customobject1000id,name,pcfsystemfield37,pcfsystemfield549",
      query: QueryHelpers.activeCycles()
    };
    
    const result = await this.query(query, true);
    return result.data && result.data.Data ? result.data.Data : [];
  }

  /**
   * Create customer with validation
   * @param {object} customerData - Customer data
   * @returns {Promise<string>} - Customer ID
   */
  async createCustomer(customerData) {
    const result = await this.createRecord(1, customerData);
    
    if (!result.data || !result.data.Record || !result.data.Record.accountid) {
      throw new FireberryAPIError('Failed to create customer: Invalid response format', 500, result);
    }
    
    return result.data.Record.accountid;
  }

  /**
   * Create registration with validation
   * @param {object} registrationData - Registration data
   * @returns {Promise<string>} - Registration ID
   */
  async createRegistration(registrationData) {
    const result = await this.createRecord(33, registrationData);
    
    if (!result.data || !result.data.Record) {
      throw new FireberryAPIError('Failed to create registration: Invalid response format', 500, result);
    }
    
    return result.data.Record.accountproductid || result.data.Record.id || 'created';
  }
}

/**
 * Singleton instance for the Fireberry client
 */
let clientInstance = null;

/**
 * Get or create Fireberry client instance
 * @param {string} apiKey - Fireberry API key
 * @param {object} options - Client options
 * @returns {FireberryClient} - Client instance
 */
function getFireberryClient(apiKey = null, options = {}) {
  if (!clientInstance || (apiKey && clientInstance.apiKey !== apiKey)) {
    const key = apiKey || process.env.FIREBERRY_API_KEY;
    if (!key) {
      throw new Error('Fireberry API key is required');
    }
    clientInstance = new FireberryClient(key, options);
  }
  return clientInstance;
}

module.exports = { 
  FireberryClient, 
  FireberryAPIError, 
  getFireberryClient 
};