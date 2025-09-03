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

    // Get object metadata for registration object (type 33) to fetch status field options
    const metadataResponse = await fetch('https://api.fireberry.com/api/metadata/33', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': FIREBERRY_API_KEY,
        'accept': 'application/json'
      }
    });

    if (!metadataResponse.ok) {
      throw new Error(`Failed to fetch metadata: ${metadataResponse.status}`);
    }

    const metadataData = await metadataResponse.json();
    
    // Find the statuscode field and extract its options
    let statusOptions = [];
    
    if (metadataData.data && metadataData.data.Fields) {
      const statusField = metadataData.data.Fields.find(field => field.FieldName === 'statuscode');
      
      if (statusField && statusField.Options) {
        statusOptions = statusField.Options.map(option => ({
          value: option.Value,
          label: option.Label,
          color: option.Color || null
        }));
      }
    }

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