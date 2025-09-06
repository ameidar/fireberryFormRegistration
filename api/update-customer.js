const { getFireberryClient, FireberryAPIError } = require('../lib/utils/fireberryClient');
const { validateId, validateName, validatePhone } = require('../lib/validation/schemas');
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
    const { accountId, accountName, phoneNumber } = req.body;

    // Validate account ID
    const idValidation = validateId(accountId);
    if (!idValidation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid account ID', 
        message: idValidation.error 
      });
    }

    // Build update payload with validation
    const updatePayload = {};
    const errors = {};
    
    if (accountName !== undefined) {
      const nameValidation = validateName(accountName);
      if (!nameValidation.isValid) {
        errors.accountName = nameValidation.error;
      } else {
        updatePayload.accountname = nameValidation.value;
      }
    }
    
    if (phoneNumber !== undefined) {
      const phoneValidation = validatePhone(phoneNumber);
      if (!phoneValidation.isValid) {
        errors.phoneNumber = phoneValidation.error;
      } else {
        updatePayload.telephone1 = phoneValidation.value;
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
      const updateData = await client.updateRecord(1, idValidation.value, updatePayload);
      
      res.status(200).json({
        success: true,
        message: 'פרטי הלקוח עודכנו בהצלחה!'
      });
    } catch (error) {
      console.error('Customer update error:', error);
      if (error instanceof FireberryAPIError) {
        return res.status(error.status || 500).json({
          error: 'Failed to update customer',
          message: error.message
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('Customer update error:', error);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      error: 'Internal server error',
      message: isDevelopment ? error.message : 'An unexpected error occurred'
    });
  }
}