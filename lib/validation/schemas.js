/**
 * Input validation schemas and sanitization functions
 */

/**
 * Validation patterns and constants
 */
const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^[\d\-\+\(\)\s]{7,20}$/,
  NAME: /^[\u0590-\u05FFa-zA-Z\s'-]{1,100}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  NUMERIC_ID: /^[0-9a-f-]{1,50}$/i
};

const VALIDATION_LIMITS = {
  NAME_MAX_LENGTH: 100,
  NAME_MIN_LENGTH: 1,
  EMAIL_MAX_LENGTH: 254,
  PHONE_MAX_LENGTH: 20,
  PHONE_MIN_LENGTH: 7,
  CHILD_NAME_MAX_LENGTH: 100,
  QUERY_PARAM_MAX_LENGTH: 100
};

/**
 * Sanitize input by removing potentially harmful characters
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  return input
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script-related content
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Limit length to prevent DoS
    .substring(0, 1000);
}

/**
 * Sanitize and validate email
 * @param {string} email - Email to validate
 * @returns {object} - Validation result
 */
function validateEmail(email) {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const sanitized = sanitizeInput(email).toLowerCase();
  
  if (sanitized.length > VALIDATION_LIMITS.EMAIL_MAX_LENGTH) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  if (!VALIDATION_PATTERNS.EMAIL.test(sanitized)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  return { isValid: true, value: sanitized };
}

/**
 * Sanitize and validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {object} - Validation result
 */
function validatePhone(phone) {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  const sanitized = sanitizeInput(phone);
  
  if (sanitized.length > VALIDATION_LIMITS.PHONE_MAX_LENGTH || 
      sanitized.length < VALIDATION_LIMITS.PHONE_MIN_LENGTH) {
    return { isValid: false, error: 'Phone number length is invalid' };
  }
  
  if (!VALIDATION_PATTERNS.PHONE.test(sanitized)) {
    return { isValid: false, error: 'Invalid phone number format' };
  }
  
  return { isValid: true, value: sanitized };
}

/**
 * Sanitize and validate name
 * @param {string} name - Name to validate
 * @returns {object} - Validation result
 */
function validateName(name) {
  if (!name) {
    return { isValid: false, error: 'Name is required' };
  }
  
  const sanitized = sanitizeInput(name);
  
  if (sanitized.length > VALIDATION_LIMITS.NAME_MAX_LENGTH || 
      sanitized.length < VALIDATION_LIMITS.NAME_MIN_LENGTH) {
    return { isValid: false, error: 'Name length is invalid' };
  }
  
  if (!VALIDATION_PATTERNS.NAME.test(sanitized)) {
    return { isValid: false, error: 'Invalid name format' };
  }
  
  return { isValid: true, value: sanitized };
}

/**
 * Validate date in YYYY-MM-DD format
 * @param {string} date - Date to validate
 * @returns {object} - Validation result
 */
function validateDate(date) {
  if (!date) {
    return { isValid: true, value: null }; // Optional field
  }
  
  const sanitized = sanitizeInput(date);
  
  if (!VALIDATION_PATTERNS.DATE.test(sanitized)) {
    return { isValid: false, error: 'Invalid date format. Use YYYY-MM-DD' };
  }
  
  const parsedDate = new Date(sanitized);
  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, error: 'Invalid date' };
  }
  
  // Check if date is not too far in the future or past
  const now = new Date();
  const hundredYearsAgo = new Date(now.getFullYear() - 100, 0, 1);
  const tenYearsFromNow = new Date(now.getFullYear() + 10, 11, 31);
  
  if (parsedDate < hundredYearsAgo || parsedDate > tenYearsFromNow) {
    return { isValid: false, error: 'Date is out of reasonable range' };
  }
  
  return { isValid: true, value: sanitized };
}

/**
 * Validate UUID or numeric ID
 * @param {string} id - ID to validate
 * @returns {object} - Validation result
 */
function validateId(id) {
  if (!id) {
    return { isValid: false, error: 'ID is required' };
  }
  
  const sanitized = sanitizeInput(id);
  
  if (sanitized.length > VALIDATION_LIMITS.QUERY_PARAM_MAX_LENGTH) {
    return { isValid: false, error: 'ID is too long' };
  }
  
  // Allow both UUID format and numeric IDs
  if (!VALIDATION_PATTERNS.UUID.test(sanitized) && 
      !VALIDATION_PATTERNS.NUMERIC_ID.test(sanitized)) {
    return { isValid: false, error: 'Invalid ID format' };
  }
  
  return { isValid: true, value: sanitized };
}

/**
 * Validate registration form data
 * @param {object} data - Form data to validate
 * @returns {object} - Validation result
 */
function validateRegistrationData(data) {
  const errors = {};
  const sanitizedData = {};
  
  // Validate parent name
  const parentNameResult = validateName(data.parentName);
  if (!parentNameResult.isValid) {
    errors.parentName = parentNameResult.error;
  } else {
    sanitizedData.parentName = parentNameResult.value;
  }
  
  // Validate phone number
  const phoneResult = validatePhone(data.phoneNumber);
  if (!phoneResult.isValid) {
    errors.phoneNumber = phoneResult.error;
  } else {
    sanitizedData.phoneNumber = phoneResult.value;
  }
  
  // Validate email (optional)
  if (data.email) {
    const emailResult = validateEmail(data.email);
    if (!emailResult.isValid) {
      errors.email = emailResult.error;
    } else {
      sanitizedData.email = emailResult.value;
    }
  }
  
  // Validate child name
  const childNameResult = validateName(data.childName);
  if (!childNameResult.isValid) {
    errors.childName = childNameResult.error;
  } else {
    sanitizedData.childName = childNameResult.value;
  }
  
  // Validate child birth date (optional)
  const birthDateResult = validateDate(data.childBirthDate);
  if (!birthDateResult.isValid) {
    errors.childBirthDate = birthDateResult.error;
  } else {
    sanitizedData.childBirthDate = birthDateResult.value;
  }
  
  // Validate program cycle
  const cycleResult = validateId(data.programCycle);
  if (!cycleResult.isValid) {
    errors.programCycle = cycleResult.error;
  } else {
    sanitizedData.programCycle = cycleResult.value;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: sanitizedData
  };
}

/**
 * Validate query parameters
 * @param {object} query - Query parameters to validate
 * @returns {object} - Validation result
 */
function validateQueryParams(query) {
  const errors = {};
  const sanitizedQuery = {};
  
  for (const [key, value] of Object.entries(query)) {
    if (typeof value !== 'string') {
      errors[key] = 'Query parameter must be a string';
      continue;
    }
    
    const sanitized = sanitizeInput(value);
    
    if (sanitized.length > VALIDATION_LIMITS.QUERY_PARAM_MAX_LENGTH) {
      errors[key] = 'Query parameter is too long';
      continue;
    }
    
    if (key.endsWith('Id') || key.endsWith('id')) {
      const idResult = validateId(sanitized);
      if (!idResult.isValid) {
        errors[key] = idResult.error;
      } else {
        sanitizedQuery[key] = idResult.value;
      }
    } else {
      sanitizedQuery[key] = sanitized;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    query: sanitizedQuery
  };
}

module.exports = {
  validateEmail,
  validatePhone,
  validateName,
  validateDate,
  validateId,
  validateRegistrationData,
  validateQueryParams,
  sanitizeInput,
  VALIDATION_PATTERNS,
  VALIDATION_LIMITS
};