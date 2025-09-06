// Temporarily use direct API calls while debugging module issues
// const { getFireberryClient, FireberryAPIError } = require('../lib/utils/fireberryClient');
// const { validateQuery } = require('../lib/middleware/validation');
// const { applySecurity } = require('../lib/middleware/security');

export default async function handler(req, res) {
  // Basic CORS headers
  const origin = req.headers.origin;
  if (origin && origin.includes('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('DEBUG - Registrations API called with query:', req.query);
    
    const { cycleId } = req.query;

    if (!cycleId) {
      console.log('DEBUG - No cycle ID provided');
      return res.status(400).json({ error: 'Cycle ID is required' });
    }

    if (!process.env.FIREBERRY_API_KEY) {
      console.log('DEBUG - No API key configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('DEBUG - Processing cycle ID:', cycleId);
    console.log('DEBUG - API key present:', !!process.env.FIREBERRY_API_KEY);

    // Get registrations for the specified cycle
    const registrationsQuery = {
      objecttype: 33,
      page_size: 2000,
      fields: "accountproductid,accountid,pcfsystemfield204,pcfsystemfield53,statuscode,pcfsystemfield56,pcfsystemfield289,pcfsystemfield298",
      query: `pcfsystemfield53 = '${cycleId}'`
    };

    console.log('DEBUG - Single registration query:', JSON.stringify(registrationsQuery, null, 2));
    console.log('DEBUG - Cycle ID:', cycleId);

    console.log('DEBUG - About to make registrations API call');
    
    let registrationsResponse;
    try {
      registrationsResponse = await fetch('https://api.fireberry.com/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'tokenid': process.env.FIREBERRY_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify(registrationsQuery)
      });
      console.log('DEBUG - Registrations API call completed, status:', registrationsResponse.status);
    } catch (fetchError) {
      console.error('DEBUG - Fetch error for registrations:', fetchError);
      return res.status(500).json({
        error: 'Network error when fetching registrations',
        message: fetchError.message
      });
    }

    if (!registrationsResponse.ok) {
      console.error(`Registrations API error! status: ${registrationsResponse.status}`);
      return res.status(500).json({ 
        error: 'Failed to fetch registrations from Fireberry API',
        status: registrationsResponse.status 
      });
    }

    const registrationsResult = await registrationsResponse.json();
    console.log('DEBUG - Registrations API response structure:', {
      hasData: !!registrationsResult.data,
      hasDataField: !!(registrationsResult.data && registrationsResult.data.Data),
      dataLength: registrationsResult.data && registrationsResult.data.Data ? registrationsResult.data.Data.length : 0
    });
    
    const registrations = registrationsResult.data && registrationsResult.data.Data ? registrationsResult.data.Data : [];

    if (registrations.length === 0) {
      console.log('DEBUG - No registrations found for cycle:', cycleId);
      return res.status(200).json({ 
        registrations: [],
        cycleId: cycleId,
        count: 0
      });
    }

    // Get unique account IDs for batch customer lookup
    const accountIds = [...new Set(registrations.map(reg => reg.accountid).filter(id => id))];
    console.log('DEBUG - Unique account IDs found:', accountIds.length);
    
    if (accountIds.length === 0) {
      console.log('DEBUG - No valid account IDs found');
      // Return registrations with basic info, no customer lookup needed
      const basicRegistrations = registrations.map(registration => ({
        registrationId: registration.accountproductid,
        accountName: 'לא נמצא',
        phoneNumber: 'לא נמצא',
        childName: registration.pcfsystemfield204 || 'לא נמצא',
        statusCode: registration.statuscode,
        paymentStatus: registration.pcfsystemfield56,
        paymentAmount: registration.pcfsystemfield289,
        birthDate: registration.pcfsystemfield298 || null
      }));
      
      return res.status(200).json({ 
        registrations: basicRegistrations,
        count: basicRegistrations.length
      });
    }

    // Batch fetch customer data
    const customersQuery = {
      objecttype: 1,
      page_size: 500,
      fields: "accountid,accountname,telephone1,emailaddress1",
      query: `(${accountIds.map(id => `(accountid = '${id}')`).join(' OR ')})`
    };

    console.log('DEBUG - About to make customers API call');
    
    let customersResponse;
    try {
      customersResponse = await fetch('https://api.fireberry.com/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'tokenid': process.env.FIREBERRY_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify(customersQuery)
      });
      console.log('DEBUG - Customers API call completed, status:', customersResponse.status);
    } catch (fetchError) {
      console.error('DEBUG - Fetch error for customers:', fetchError);
      // Return registrations without customer names instead of failing
      const basicRegistrations = registrations.map(registration => ({
        registrationId: registration.accountproductid,
        accountName: 'לא נמצא (שגיאת רשת)',
        phoneNumber: 'לא נמצא (שגיאת רשת)',
        childName: registration.pcfsystemfield204 || 'לא נמצא',
        statusCode: registration.statuscode,
        paymentStatus: registration.pcfsystemfield56,
        paymentAmount: registration.pcfsystemfield289,
        birthDate: registration.pcfsystemfield298 || null
      }));
      
      return res.status(200).json({ 
        registrations: basicRegistrations,
        count: basicRegistrations.length
      });
    }

    if (!customersResponse.ok) {
      console.error(`Customers API error! status: ${customersResponse.status}`);
      // Don't fail the whole request, just return registrations without customer names
      const basicRegistrations = registrations.map(registration => ({
        registrationId: registration.accountproductid,
        accountName: 'לא נמצא (שגיאה בטעינה)',
        phoneNumber: 'לא נמצא (שגיאה בטעינה)',
        childName: registration.pcfsystemfield204 || 'לא נמצא',
        statusCode: registration.statuscode,
        paymentStatus: registration.pcfsystemfield56,
        paymentAmount: registration.pcfsystemfield289,
        birthDate: registration.pcfsystemfield298 || null
      }));
      
      return res.status(200).json({ 
        registrations: basicRegistrations,
        count: basicRegistrations.length
      });
    }

    const customersResult = await customersResponse.json();
    console.log('DEBUG - Customers API response structure:', {
      hasData: !!customersResult.data,
      hasDataField: !!(customersResult.data && customersResult.data.Data),
      dataLength: customersResult.data && customersResult.data.Data ? customersResult.data.Data.length : 0
    });
    
    const customers = customersResult.data && customersResult.data.Data ? customersResult.data.Data : [];
    
    // Create lookup maps for efficient data joining
    const customerMap = {};
    const phoneMap = {};
    
    customers.forEach(customer => {
      customerMap[customer.accountid] = customer.accountname;
      phoneMap[customer.accountid] = customer.telephone1;
    });

    // Transform registrations with customer data
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
    res.status(500).json({
      error: 'Failed to fetch registrations',
      message: error.message
    });
  }
}