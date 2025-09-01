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
    const FIREBERRY_API_KEY = '8a7dfba2-1e98-4771-9a99-9557ce5db9dd';
    
    const queryPayload = {
      objecttype: 1000,
      page_size: 500,
      fields: "customobject1000id,name,pcfsystemfield548,pcfsystemfield550,pcfsystemfield192,pcfsystemfield552,pcfsystemfield551,pcfsystemfield37",
      query: "pcfsystemfield37 = 3"
    };

    const response = await fetch('https://api.fireberry.com/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': FIREBERRY_API_KEY,
        'accept': 'application/json'
      },
      body: JSON.stringify(queryPayload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform data for frontend
    const cycles = data.data && data.data.Data ? data.data.Data.map(cycle => ({
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