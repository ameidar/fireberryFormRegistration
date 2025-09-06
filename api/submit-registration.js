const { getFireberryClient, FireberryAPIError } = require('../lib/utils/fireberryClient');
const { validateRegistration } = require('../lib/middleware/validation');
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply validation middleware
  try {
    await new Promise((resolve, reject) => {
      validateRegistration(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    return; // Response already sent by validation middleware
  }

  try {
    const { parentName, phoneNumber, email, childName, childBirthDate, programCycle } = req.body;
    const client = getFireberryClient();

    let customerId = null;
    let customerExists = false;

    // Check if customer already exists (using secure queries)
    const existingCustomer = await client.findCustomer(email, phoneNumber);
    
    if (existingCustomer) {
      customerId = existingCustomer.accountid;
      customerExists = true;
      console.log('Found existing customer:', customerId);
    } else {
      // Create new customer with validated data
      const customerPayload = {
        accountname: parentName,
        telephone1: phoneNumber
      };
      
      // Only add email if provided
      if (email) {
        customerPayload.emailaddress1 = email;
      }

      try {
        customerId = await client.createCustomer(customerPayload);
        console.log('New customer created:', customerId);
      } catch (error) {
        console.error('Customer creation error:', error);
        if (error instanceof FireberryAPIError) {
          return res.status(error.status || 500).json({
            error: 'Failed to create customer',
            message: error.message
          });
        }
        throw error;
      }
    }

    // Create registration record with validated data
    const registrationPayload = {
      accountid: customerId,
      pcfsystemfield204: childName,
      pcfsystemfield53: programCycle,
      productid: '01333c9a-fb67-4b3f-b293-e71ec55c42b4'
    };
    
    // Only add birth date if provided
    if (childBirthDate) {
      registrationPayload.pcfsystemfield298 = childBirthDate;
    }

    let registrationId;
    try {
      registrationId = await client.createRegistration(registrationPayload);
      console.log('Registration created:', registrationId);
    } catch (error) {
      console.error('Registration creation error:', error);
      if (error instanceof FireberryAPIError) {
        return res.status(error.status || 500).json({
          error: 'Failed to create registration',
          message: error.message
        });
      }
      throw error;
    }

    // Return sanitized success response (no sensitive data)
    res.status(200).json({
      success: true,
      message: customerExists ? 'רישום נשלח בהצלחה! הלקוח הקיים עודכן.' : 'רישום נשלח בהצלחה! לקוח חדש נרשם.',
      registrationId: registrationId,
      customerExists: customerExists
    });

  } catch (error) {
    console.error('Registration submission error:', error);
    
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (error instanceof FireberryAPIError) {
      res.status(error.status || 500).json({
        error: 'Registration failed',
        message: isDevelopment ? error.message : 'An error occurred during registration'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'An unexpected error occurred'
      });
    }
  }
}