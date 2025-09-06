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
    console.log('[DEBUG] Starting admin-cycles API call');
    
    // Step 1: Get all active cycles with pcfsystemfield549 - EXACT COPY FROM MAIN BRANCH
    const cyclesQuery = {
      objecttype: 1000,
      page_size: 500,
      fields: "customobject1000id,name,pcfsystemfield37,pcfsystemfield549",
      query: "pcfsystemfield37 = 3"
    };
    
    console.log('[DEBUG] Cycles query:', JSON.stringify(cyclesQuery));

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
    
    if (!cyclesData.data || !cyclesData.data.Data) {
      return res.status(200).json({ cycles: [] });
    }

    // Filter cycles by pcfsystemfield549 != "פרטי" - EXACT COPY FROM MAIN BRANCH
    console.log('All cycles before filtering:', cyclesData.data.Data.map(c => ({
      name: c.name,
      pcfsystemfield549: c.pcfsystemfield549
    })));
    
    const validCycles = cyclesData.data.Data.filter(cycle => {
      const fieldValue = cycle.pcfsystemfield549;
      const trimmedValue = fieldValue ? fieldValue.toString().trim() : '';
      const isValid = trimmedValue !== "פרטי";
      console.log(`Cycle: ${cycle.name}, field549: "${fieldValue}", trimmed: "${trimmedValue}", isValid: ${isValid}`);
      return isValid;
    });
    
    console.log('Valid cycles after filtering:', validCycles.length);

    if (validCycles.length === 0) {
      return res.status(200).json({ cycles: [] });
    }

    // Step 2: Get all registrations for valid cycles in one query - EXACT COPY FROM MAIN BRANCH
    const cycleIds = validCycles.map(cycle => cycle.customobject1000id);
    const cycleConditions = cycleIds.map(id => `pcfsystemfield53 = '${id}'`).join(' OR ');
    
    const registrationsQuery = {
      objecttype: 33,
      page_size: 2000,
      fields: "pcfsystemfield53",
      query: `(${cycleConditions})`
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

    let registrationCounts = {};
    if (registrationsResponse.ok) {
      const registrationsData = await registrationsResponse.json();
      
      // Count registrations per cycle - EXACT COPY FROM MAIN BRANCH
      if (registrationsData.data && registrationsData.data.Data) {
        registrationsData.data.Data.forEach(registration => {
          const cycleId = registration.pcfsystemfield53;
          if (cycleId) {
            registrationCounts[cycleId] = (registrationCounts[cycleId] || 0) + 1;
          }
        });
      }
    }

    // Step 3: Build final result with only cycles that have registrations - EXACT COPY FROM MAIN BRANCH
    console.log('Registration counts:', registrationCounts);
    
    const cyclesWithRegistrations = validCycles
      .filter(cycle => {
        const count = registrationCounts[cycle.customobject1000id] || 0;
        console.log(`Cycle ${cycle.name}: registrations = ${count}`);
        return count > 0;
      })
      .map(cycle => ({
        id: cycle.customobject1000id,
        name: cycle.name,
        pcfsystemfield549: cycle.pcfsystemfield549,
        count: registrationCounts[cycle.customobject1000id] || 0
      }));
      
    console.log('Final cycles with registrations:', cyclesWithRegistrations.length);

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