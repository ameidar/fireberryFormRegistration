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
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Cycle ID is required' });
    }

    if (!process.env.FIREBERRY_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Get registrations for the specified cycle
    const registrationsQuery = {
      objecttype: 33,
      page_size: 2000,
      fields: "accountproductid,accountid,pcfsystemfield204,pcfsystemfield53,statuscode,pcfsystemfield56,pcfsystemfield289,pcfsystemfield298",
      query: `pcfsystemfield53 = '${cycleId}'`
    };

    const registrationsResponse = await fetch('https://api.fireberry.com/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': process.env.FIREBERRY_API_KEY,
        'accept': 'application/json'
      },
      body: JSON.stringify(registrationsQuery)
    });

    if (!registrationsResponse.ok) {
      throw new Error(`Registrations API error! status: ${registrationsResponse.status}`);
    }

    const registrationsResult = await registrationsResponse.json();
    const registrations = registrationsResult.data && registrationsResult.data.Data ? registrationsResult.data.Data : [];

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

    // Batch fetch customer data
    const customersQuery = {
      objecttype: 1,
      page_size: 500,
      fields: "accountid,accountname,telephone1,emailaddress1",
      query: `accountid IN ('${accountIds.join("','")}')`
    };

    const customersResponse = await fetch('https://api.fireberry.com/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': process.env.FIREBERRY_API_KEY,
        'accept': 'application/json'
      },
      body: JSON.stringify(customersQuery)
    });

    if (!customersResponse.ok) {
      throw new Error(`Customers API error! status: ${customersResponse.status}`);
    }

    const customersResult = await customersResponse.json();
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