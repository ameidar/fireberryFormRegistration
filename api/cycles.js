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
    
    // Step 1: Get all registrations to find which cycles have registrations
    const registrationsQuery = {
      objecttype: 33,
      page_size: 1000,
      fields: "pcfsystemfield53",
      query: "pcfsystemfield53 is-not-null"
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
    
    // Get unique cycle IDs that have registrations
    const cycleIdsWithRegistrations = new Set();
    if (registrationsData.data && registrationsData.data.Data) {
      registrationsData.data.Data.forEach(registration => {
        if (registration.pcfsystemfield53) {
          cycleIdsWithRegistrations.add(registration.pcfsystemfield53);
        }
      });
    }

    if (cycleIdsWithRegistrations.size === 0) {
      return res.status(200).json({ cycles: [] });
    }

    // Step 2: Get cycles that have registrations AND are active
    const cycleIdsArray = Array.from(cycleIdsWithRegistrations);
    const cycleConditions = cycleIdsArray.map(id => `customobject1000id = '${id}'`).join(' OR ');
    
    const cyclesQuery = {
      objecttype: 1000,
      page_size: 500,
      fields: "customobject1000id,name,pcfsystemfield37",
      query: `(pcfsystemfield37 = 3) AND (${cycleConditions})`
    };

    const cyclesResponse = await fetch('https://api.fireberry.com/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': FIREBERRY_API_KEY,
        'accept': 'application/json'
      },
      body: JSON.stringify(cyclesQuery)
    });

    if (!cyclesResponse.ok) {
      throw new Error(`Failed to fetch cycles: ${cyclesResponse.status}`);
    }

    const cyclesData = await cyclesResponse.json();
    
    // Transform data for frontend
    const cycles = cyclesData.data && cyclesData.data.Data ? cyclesData.data.Data.map(cycle => ({
      id: cycle.customobject1000id,
      name: cycle.name
    })) : [];

    res.status(200).json({ cycles });
  } catch (error) {
    console.error('Error fetching cycles:', error);
    res.status(500).json({ 
      error: 'Failed to fetch cycles',
      message: error.message 
    });
  }
}