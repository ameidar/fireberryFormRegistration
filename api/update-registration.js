const { getFireberryClient, FireberryAPIError } = require('../lib/utils/fireberryClient');
const { validateId, validateName, sanitizeInput } = require('../lib/validation/schemas');
const { applySecurity } = require('../lib/middleware/security');

export default async function handler(req, res) {
  // Apply security middleware
  try {
    await new Promise((resolve, reject) => {
      applySecurity(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    return; // Response already sent by security middleware
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { registrationId, childName, statusCode } = req.body;

    // Validate registration ID
    const idValidation = validateId(registrationId);
    if (!idValidation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid registration ID', 
        message: idValidation.error 
      });
    }

    // Build update payload with validation
    const updatePayload = {};
    const errors = {};
    
    if (childName !== undefined) {
      const nameValidation = validateName(childName);
      if (!nameValidation.isValid) {
        errors.childName = nameValidation.error;
      } else {
        updatePayload.pcfsystemfield204 = nameValidation.value;
      }
    }
    
    if (statusCode !== undefined) {
      // Validate status code is a number
      const numericStatus = parseInt(statusCode, 10);
      if (isNaN(numericStatus) || numericStatus < 1 || numericStatus > 100) {
        errors.statusCode = 'Invalid status code';
      } else {
        updatePayload.statuscode = numericStatus;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const client = getFireberryClient();
    
    try {
      const updateData = await client.updateRecord(33, idValidation.value, updatePayload);
      
      res.status(200).json({
        success: true,
        message: 'רישום עודכן בהצלחה!'
      });
    } catch (error) {
      console.error('Registration update error:', error);
      if (error instanceof FireberryAPIError) {
        return res.status(error.status || 500).json({
          error: 'Failed to update registration',
          message: error.message
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('Registration update error:', error);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      error: 'Internal server error',
      message: isDevelopment ? error.message : 'An unexpected error occurred'
    });
  }
}