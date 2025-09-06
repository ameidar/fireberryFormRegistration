// Temporarily use direct API calls while debugging module issues
// const { getFireberryClient, FireberryAPIError } = require('../lib/utils/fireberryClient');
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
    if (!process.env.FIREBERRY_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Step 1: Get all active cycles
    const cyclesQuery = {
      objecttype: 1000,
      fields: "customobject1000id,name,pcfsystemfield37,pcfsystemfield549",
      query: "pcfsystemfield37 = 3"
    };

    console.log('DEBUG - Cycles query:', JSON.stringify(cyclesQuery, null, 2));

    const cyclesResponse = await fetch('https://api.fireberry.com/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': process.env.FIREBERRY_API_KEY,
        'accept': 'application/json'
      },
      body: JSON.stringify(cyclesQuery)
    });

    if (!cyclesResponse.ok) {
      console.error(`Cycles API error! status: ${cyclesResponse.status}`);
      return res.status(500).json({ 
        error: 'Failed to fetch cycles from Fireberry API',
        status: cyclesResponse.status 
      });
    }

    const cyclesResult = await cyclesResponse.json();
    console.log('DEBUG - Cycles API response structure:', {
      hasData: !!cyclesResult.data,
      hasDataField: !!(cyclesResult.data && cyclesResult.data.Data),
      dataLength: cyclesResult.data && cyclesResult.data.Data ? cyclesResult.data.Data.length : 0
    });
    
    const cyclesData = cyclesResult.data && cyclesResult.data.Data ? cyclesResult.data.Data : [];
    
    if (cyclesData.length === 0) {
      return res.status(200).json({ cycles: [], totalCycles: 0 });
    }

    // Filter cycles by type (exclude "פרטי" - private cycles)
    const validCycles = cyclesData.filter(cycle => {
      const fieldValue = cycle.pcfsystemfield549;
      const trimmedValue = fieldValue ? fieldValue.toString().trim() : '';
      return trimmedValue !== "פרטי";
    });
    
    if (validCycles.length === 0) {
      return res.status(200).json({ cycles: [], totalCycles: 0 });
    }

    // Step 2: Get all registrations for valid cycles
    const cycleIds = validCycles.map(cycle => cycle.customobject1000id);
    let allRegistrations = [];
    
    console.log('DEBUG - Number of cycle IDs:', cycleIds.length);

    if (cycleIds.length > 0) {
      // Use single query approach like main branch for reliability
      const cycleConditions = cycleIds.map(id => `pcfsystemfield53 = ${id}`).join(' OR ');
      
      const registrationsQuery = {
        objecttype: 33,
        page_size: 2000,
        fields: "accountproductid,accountid,pcfsystemfield204,pcfsystemfield53,statuscode",
        query: `(${cycleConditions})`
      };

      console.log('DEBUG - Registration query:', JSON.stringify(registrationsQuery, null, 2));

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
        console.error(`Registrations API error! status: ${registrationsResponse.status}`);
        // Don't throw error, just continue with empty registrations
        allRegistrations = [];
      } else {
        const registrationsResult = await registrationsResponse.json();
        allRegistrations = registrationsResult.data && registrationsResult.data.Data ? registrationsResult.data.Data : [];
        console.log('DEBUG - Total registrations found:', allRegistrations.length);
      }
    }

    const registrations = allRegistrations;
    
    // Count registrations per cycle
    const registrationCounts = {};
    registrations.forEach(registration => {
      const cycleId = registration.pcfsystemfield53;
      if (cycleId) {
        registrationCounts[cycleId] = (registrationCounts[cycleId] || 0) + 1;
      }
    });

    // Step 3: Build final result with only cycles that have registrations
    const cyclesWithRegistrations = validCycles
      .filter(cycle => {
        const count = registrationCounts[cycle.customobject1000id] || 0;
        return count > 0;
      })
      .map(cycle => ({
        id: cycle.customobject1000id,
        name: cycle.name,
        type: cycle.pcfsystemfield549 || 'Unknown',
        count: registrationCounts[cycle.customobject1000id] || 0
      }));

    res.status(200).json({ 
      cycles: cyclesWithRegistrations,
      totalCycles: cyclesWithRegistrations.length 
    });

  } catch (error) {
    console.error('Error fetching admin cycles:', error);
    res.status(500).json({
      error: 'Failed to fetch admin cycles',
      message: error.message
    });
  }
}