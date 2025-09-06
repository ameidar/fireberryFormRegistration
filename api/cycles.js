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
    // Debug: Check if API key is available
    console.log('Environment check - API key present:', !!process.env.FIREBERRY_API_KEY);
    
    if (!process.env.FIREBERRY_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Direct API call to Fireberry
    const queryPayload = {
      objecttype: 1000,
      fields: "customobject1000id,name,pcfsystemfield37,pcfsystemfield549",
      query: "pcfsystemfield37 = 3"
    };

    const response = await fetch('https://api.fireberry.com/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': process.env.FIREBERRY_API_KEY,
        'accept': 'application/json'
      },
      body: JSON.stringify(queryPayload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const cyclesData = result.data && result.data.Data ? result.data.Data : [];
    
    // Transform and sanitize data for frontend
    const cycles = cyclesData.map(cycle => ({
      id: cycle.customobject1000id,
      name: cycle.name,
      type: cycle.pcfsystemfield549 || 'Unknown'
    }));

    res.status(200).json({ cycles });
  } catch (error) {
    console.error('Error fetching cycles:', error);
    res.status(500).json({
      error: 'Failed to fetch cycles',
      message: error.message
    });
  }
}