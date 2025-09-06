/**
 * Input validation middleware for API endpoints
 */

const { 
  validateRegistrationData, 
  validateQueryParams,
  sanitizeInput 
} = require('../validation/schemas');

/**
 * Middleware to validate registration form data
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next function
 */
function validateRegistration(req, res, next) {
  if (req.method !== 'POST') {
    return next();
  }
  
  const validation = validateRegistrationData(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.errors
    });
  }
  
  // Replace request body with sanitized data
  req.body = validation.data;
  next();
}

/**
 * Middleware to validate query parameters
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next function
 */
function validateQuery(req, res, next) {
  if (Object.keys(req.query).length === 0) {
    return next();
  }
  
  const validation = validateQueryParams(req.query);
  
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      details: validation.errors
    });
  }
  
  // Replace query with sanitized data
  req.query = validation.query;
  next();
}

/**
 * Generic input sanitization middleware
 * Sanitizes all string inputs in request body and query
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next function
 */
function sanitizeRequest(req, res, next) {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = sanitizeInput(value);
      }
    }
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeInput(value);
      }
    }
  }
  
  next();
}

/**
 * Middleware to validate request size and prevent DoS attacks
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next function
 */
function validateRequestSize(req, res, next) {
  // Check if request body is too large
  if (req.body) {
    const bodyString = JSON.stringify(req.body);
    if (bodyString.length > 10000) { // 10KB limit
      return res.status(413).json({
        error: 'Request body too large',
        message: 'Request size exceeds the allowed limit'
      });
    }
  }
  
  // Check if there are too many query parameters
  if (Object.keys(req.query).length > 20) {
    return res.status(400).json({
      error: 'Too many query parameters',
      message: 'Reduce the number of query parameters'
    });
  }
  
  next();
}

/**
 * Middleware to validate content type for POST requests
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next function
 */
function validateContentType(req, res, next) {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'Invalid content type',
        message: 'Content-Type must be application/json'
      });
    }
  }
  
  next();
}

/**
 * Combine all validation middleware into a single function
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next function
 */
function validateAll(req, res, next) {
  validateRequestSize(req, res, (err) => {
    if (err) return next(err);
    
    validateContentType(req, res, (err) => {
      if (err) return next(err);
      
      sanitizeRequest(req, res, (err) => {
        if (err) return next(err);
        
        validateQuery(req, res, next);
      });
    });
  });
}

module.exports = {
  validateRegistration,
  validateQuery,
  sanitizeRequest,
  validateRequestSize,
  validateContentType,
  validateAll
};