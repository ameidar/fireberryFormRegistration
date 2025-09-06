/**
 * Security middleware for CORS, rate limiting, and other security measures
 */

/**
 * Configure secure CORS headers
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next function
 */
function configureCORS(req, res, next) {
  // Get allowed origins from environment or use defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'http://localhost:3000', 
        'https://fireberry-form-registration-git-main-ameidars-projects.vercel.app',
        'https://fireberry-form-registration-git-security-improvements-ameidars-projects.vercel.app',
        'https://fireberryformregistration.vercel.app'
      ];

  const origin = req.headers.origin;
  
  // Check if origin is allowed
  const isVercelDomain = origin && origin.includes('.vercel.app');
  const isAllowedOrigin = allowedOrigins.includes(origin);
  
  if (isAllowedOrigin || isVercelDomain) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // In development, be more permissive but log it
    console.warn(`CORS Warning: Origin not in allowed list: ${origin}`);
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  // Set other CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', [
    'Accept',
    'Accept-Version',
    'Authorization',
    'Content-Length',
    'Content-MD5',
    'Content-Type',
    'Date',
    'X-Api-Version',
    'X-CSRF-Token',
    'X-Requested-With'
  ].join(','));
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(200).end();
    return;
  }
  
  next();
}

/**
 * Simple in-memory rate limiter
 * In production, use Redis or a proper rate limiting service
 */
class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
    
    // Clean up old entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.requests) {
        if (now - data.resetTime > this.windowMs * 2) {
          this.requests.delete(key);
        }
      }
    }, 300000);
  }
  
  /**
   * Get client identifier (IP address with optional user agent)
   * @param {object} req - Request object
   * @returns {string} - Client identifier
   */
  getClientId(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    return `${ip}:${userAgent.substring(0, 50)}`; // Truncate user agent
  }
  
  /**
   * Check if request is allowed
   * @param {object} req - Request object
   * @returns {object} - Rate limit result
   */
  checkRequest(req) {
    const clientId = this.getClientId(req);
    const now = Date.now();
    
    let clientData = this.requests.get(clientId);
    
    if (!clientData || now - clientData.resetTime > this.windowMs) {
      // Reset window
      clientData = {
        requests: 0,
        resetTime: now
      };
    }
    
    clientData.requests += 1;
    this.requests.set(clientId, clientData);
    
    const remaining = Math.max(0, this.maxRequests - clientData.requests);
    const resetTime = clientData.resetTime + this.windowMs;
    
    return {
      allowed: clientData.requests <= this.maxRequests,
      remaining,
      resetTime,
      total: this.maxRequests
    };
  }
}

// Create rate limiters for different endpoints
const generalLimiter = new RateLimiter(60000, 60); // 60 requests per minute
const registrationLimiter = new RateLimiter(300000, 5); // 5 registrations per 5 minutes

/**
 * Rate limiting middleware
 * @param {string} type - Type of rate limiter ('general' or 'registration')
 * @returns {function} - Middleware function
 */
function rateLimit(type = 'general') {
  const limiter = type === 'registration' ? registrationLimiter : generalLimiter;
  
  return (req, res, next) => {
    const result = limiter.checkRequest(req);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.total);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      });
    }
    
    next();
  };
}

/**
 * Request logging middleware for security monitoring
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next function
 */
function logRequest(req, res, next) {
  const startTime = Date.now();
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${ip}`);
  
  // Log response when it finishes
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    originalSend.call(this, data);
  };
  
  next();
}

/**
 * Detect and prevent common attack patterns
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next function
 */
function detectAttacks(req, res, next) {
  const suspiciousPatterns = [
    /(<script|javascript:|vbscript:|onload=|onerror=)/i,
    /(union\s+select|drop\s+table|insert\s+into)/i,
    /(\.\.\/|\.\.\\|\/etc\/|\/proc\/)/i,
    /(\$\{.*\}|<%.*%>|{{.*}})/i
  ];
  
  const checkString = JSON.stringify(req.body) + JSON.stringify(req.query) + req.url;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      console.warn(`[SECURITY ALERT] Suspicious pattern detected from ${req.connection.remoteAddress}: ${pattern}`);
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request contains invalid characters'
      });
    }
  }
  
  next();
}

/**
 * Combined security middleware
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next function
 */
function applySecurity(req, res, next) {
  configureCORS(req, res, (err) => {
    if (err) return next(err);
    
    // Skip rate limiting for OPTIONS requests
    if (req.method === 'OPTIONS') {
      return next();
    }
    
    logRequest(req, res, (err) => {
      if (err) return next(err);
      
      detectAttacks(req, res, (err) => {
        if (err) return next(err);
        
        // Apply rate limiting based on endpoint
        const limiterType = req.url.includes('submit-registration') ? 'registration' : 'general';
        rateLimit(limiterType)(req, res, next);
      });
    });
  });
}

module.exports = {
  configureCORS,
  rateLimit,
  logRequest,
  detectAttacks,
  applySecurity,
  RateLimiter
};