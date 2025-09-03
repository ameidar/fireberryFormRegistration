export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

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

    // Query registrations for the specified cycle
    const registrationsQuery = {
      objecttype: 33,
      page_size: 500,
      fields: "accountproductid,accountid,pcfsystemfield204,pcfsystemfield53,statuscode",
      query: `pcfsystemfield53 = ${cycleId}`
    };

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
    console.log('Registrations response:', JSON.stringify(registrationsData, null, 2));

    if (!registrationsData.data || !registrationsData.data.Data) {
      return res.status(200).json({ registrations: [] });
    }

    const registrations = registrationsData.data.Data;

    // Get unique account IDs to fetch customer names
    const accountIds = [...new Set(registrations.map(reg => reg.accountid).filter(id => id))];
    
    if (accountIds.length === 0) {
      return res.status(200).json({ registrations: [] });
    }

    // Query customer names for all account IDs
    const customersQuery = {
      objecttype: 1,
      page_size: 500,
      fields: "accountid,accountname",
      query: `accountid in (${accountIds.map(id => `'${id}'`).join(',')})`
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
    if (customersResponse.ok) {
      const customersData = await customersResponse.json();
      if (customersData.data && customersData.data.Data) {
        customersData.data.Data.forEach(customer => {
          customerMap[customer.accountid] = customer.accountname;
        });
      }
    }

    // Transform registrations with customer names
    const transformedRegistrations = registrations.map(registration => ({
      registrationId: registration.accountproductid,
      accountId: registration.accountid,
      accountName: customerMap[registration.accountid] || registration.accountid,
      childName: registration.pcfsystemfield204 || 'לא נמצא',
      statusCode: registration.statuscode,
      cycleId: registration.pcfsystemfield53
    }));

    console.log('Customer map:', customerMap);
    console.log('Transformed registrations:', transformedRegistrations);

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