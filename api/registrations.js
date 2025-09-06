const { getFireberryClient, FireberryAPIError } = require('../lib/utils/fireberryClient');
const { validateQuery } = require('../lib/middleware/validation');
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply validation middleware
  try {
    await new Promise((resolve, reject) => {
      validateQuery(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    return; // Response already sent by validation middleware
  }

  try {
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Cycle ID is required' });
    }

    const client = getFireberryClient();

    // Get registrations for the specified cycle (secure query)
    const registrations = await client.getRegistrationsBatch([cycleId]);

    if (registrations.length === 0) {
      return res.status(200).json({ 
        registrations: [],
        cycleId: cycleId,
        count: 0
      });
    }

    // Get unique account IDs for batch customer lookup
    const accountIds = [...new Set(registrations.map(reg => reg.accountid).filter(id => id))];
    
    if (accountIds.length === 0) {
      return res.status(200).json({ 
        registrations: [],
        cycleId: cycleId,
        count: 0
      });
    }

    // Batch fetch customer data (optimized performance)
    const customers = await client.getCustomersBatch(accountIds);
    
    // Create lookup maps for efficient data joining
    const customerMap = {};
    const phoneMap = {};
    
    customers.forEach(customer => {
      customerMap[customer.accountid] = customer.accountname;
      phoneMap[customer.accountid] = customer.telephone1;
    });

    // Transform registrations with customer data (sanitized output)
    const transformedRegistrations = registrations.map(registration => ({
      registrationId: registration.accountproductid,
      accountName: customerMap[registration.accountid] || 'לא נמצא',
      phoneNumber: phoneMap[registration.accountid] || 'לא נמצא',
      childName: registration.pcfsystemfield204 || 'לא נמצא',
      statusCode: registration.statuscode,
      paymentStatus: registration.pcfsystemfield56,
      paymentAmount: registration.pcfsystemfield289,
      birthDate: registration.pcfsystemfield298 || null
    }));

    res.status(200).json({ 
      registrations: transformedRegistrations,
      count: transformedRegistrations.length
    });

  } catch (error) {
    console.error('Error fetching registrations:', error);
    
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (error instanceof FireberryAPIError) {
      res.status(error.status || 500).json({
        error: 'Failed to fetch registrations',
        message: isDevelopment ? error.message : 'Unable to retrieve registration data'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'An unexpected error occurred'
      });
    }
  }
}