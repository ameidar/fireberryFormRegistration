export default async function handler(req, res) {
  // Basic CORS headers (security improved)
  const origin = req.headers.origin;
  if (origin && origin.includes('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const FIREBERRY_API_KEY = process.env.FIREBERRY_API_KEY;
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Cycle ID is required' });
    }

    // Query registrations for the specified cycle - EXACT COPY FROM MAIN BRANCH
    const registrationsQuery = {
      objecttype: 33,
      page_size: 500,
      fields: "accountproductid,accountid,pcfsystemfield204,pcfsystemfield53,statuscode,pcfsystemfield56,pcfsystemfield289",
      query: `pcfsystemfield53 = ${cycleId}`
    };

    console.log('DEBUG MAIN BRANCH - Registration query:', JSON.stringify(registrationsQuery, null, 2));
    console.log('DEBUG MAIN BRANCH - Cycle ID:', cycleId);
    console.log('DEBUG MAIN BRANCH - Cycle ID type:', typeof cycleId);

    const registrationsResponse = await fetch('https://api.fireberry.com/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': FIREBERRY_API_KEY,
        'accept': 'application/json'
      },
      body: JSON.stringify(registrationsQuery)
    });

    if (!registrationsResponse.ok) {
      throw new Error(`Failed to fetch registrations: ${registrationsResponse.status}`);
    }

    const registrationsData = await registrationsResponse.json();

    if (!registrationsData.data || !registrationsData.data.Data) {
      return res.status(200).json({ registrations: [] });
    }

    const registrations = registrationsData.data.Data;

    // Get unique account IDs to fetch customer names
    const accountIds = [...new Set(registrations.map(reg => reg.accountid).filter(id => id))];
    
    if (accountIds.length === 0) {
      return res.status(200).json({ registrations: [] });
    }

    // Query customer names for all account IDs - EXACT COPY FROM MAIN BRANCH
    const accountConditions = accountIds.map(id => `(accountid = '${id}')`).join(' OR ');
    
    const customersQuery = {
      objecttype: 1,
      page_size: 500,
      fields: "accountid,accountname,telephone1",
      query: `(${accountConditions})`
    };

    const customersResponse = await fetch('https://api.fireberry.com/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': FIREBERRY_API_KEY,
        'accept': 'application/json'
      },
      body: JSON.stringify(customersQuery)
    });

    let customerMap = {};
    let phoneMap = {};
    if (customersResponse.ok) {
      const customersData = await customersResponse.json();
      
      if (customersData.data && customersData.data.Data) {
        customersData.data.Data.forEach(customer => {
          customerMap[customer.accountid] = customer.accountname;
          phoneMap[customer.accountid] = customer.telephone1;
        });
      }
    }

    // Transform registrations with customer names - EXACT COPY FROM MAIN BRANCH
    const transformedRegistrations = registrations.map(registration => ({
      registrationId: registration.accountproductid,
      accountId: registration.accountid,
      accountName: customerMap[registration.accountid] || registration.accountid,
      phoneNumber: phoneMap[registration.accountid] || 'לא נמצא',
      childName: registration.pcfsystemfield204 || 'לא נמצא',
      statusCode: registration.statuscode,
      cycleId: registration.pcfsystemfield53,
      paymentStatus: registration.pcfsystemfield56,
      paymentAmount: registration.pcfsystemfield289
    }));

    res.status(200).json({ 
      registrations: transformedRegistrations,
      cycleId: cycleId,
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