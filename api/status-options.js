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

    console.log('Attempting to fetch status options...');
    console.log('API Key available:', !!FIREBERRY_API_KEY);

    // Since metadata endpoint doesn't exist, and we need all possible status options
    // (not just ones currently in use), let's try different API endpoints
    let statusOptions = [];
    
    // Method 1: Try objects endpoint to get object definition
    console.log('Trying objects endpoint for object 33...');
    
    try {
      const objectsResponse = await fetch('https://api.fireberry.com/api/objects/33', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'tokenid': FIREBERRY_API_KEY,
          'accept': 'application/json'
        }
      });

      console.log('Objects response status:', objectsResponse.status);
      
      if (objectsResponse.ok) {
        const objectsData = await objectsResponse.json();
        console.log('Objects response:', JSON.stringify(objectsData, null, 2));
      } else {
        console.log('Objects endpoint failed');
      }
    } catch (error) {
      console.log('Objects endpoint error:', error.message);
    }

    // Method 2: Try schema or definition endpoint
    console.log('Trying schema endpoint...');
    
    try {
      const schemaResponse = await fetch('https://api.fireberry.com/api/schema/33', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'tokenid': FIREBERRY_API_KEY,
          'accept': 'application/json'
        }
      });

      console.log('Schema response status:', schemaResponse.status);
      
      if (schemaResponse.ok) {
        const schemaData = await schemaResponse.json();
        console.log('Schema response:', JSON.stringify(schemaData, null, 2));
      } else {
        console.log('Schema endpoint failed');
      }
    } catch (error) {
      console.log('Schema endpoint error:', error.message);
    }

    // Method 3: Since API endpoints for metadata don't seem available, 
    // create manual mapping based on the status list from the image
    console.log('Using manual status mapping based on Fireberry status list...');
    
    statusOptions = [
      { value: 4, label: 'חדש', color: '#2196F3' },
      { value: 8, label: 'נרשם', color: '#4CAF50' },
      { value: 22, label: 'נרשם חיצוני', color: '#4CAF50' },
      { value: 9, label: 'ביטל', color: '#F44336' },
      { value: 23, label: 'מחכה לשיבוץ', color: '#00BCD4' },
      { value: 10, label: 'פולואפ', color: '#8BC34A' },
      { value: 11, label: 'הוזמנו לשיעור נסיון', color: '#FF9800' },
      { value: 18, label: 'סיים', color: '#9C27B0' }
    ];

    console.log('Using manual status options:', statusOptions);

    // If no options found, fall back to common status values
    if (statusOptions.length === 0) {
      statusOptions = [
        { value: 1, label: 'פעיל', color: null },
        { value: 2, label: 'לא פעיל', color: null },
        { value: 3, label: 'בוטל', color: null },
        { value: 4, label: 'ממתין', color: null },
        { value: 5, label: 'מושלם', color: null }
      ];
    }

    res.status(200).json({ 
      statusOptions: statusOptions
    });

  } catch (error) {
    console.error('Error fetching status options:', error);
    res.status(500).json({ 
      error: 'Failed to fetch status options',
      message: error.message 
    });
  }
}