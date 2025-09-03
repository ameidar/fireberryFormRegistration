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

    console.log('Attempting to fetch metadata for object type 33...');
    console.log('API Key available:', !!FIREBERRY_API_KEY);

    // Try different approaches to get status options
    // Method 1: Try getting object metadata
    let statusOptions = [];
    let metadataUrl = 'https://api.fireberry.com/api/metadata/33';
    
    console.log('Making request to:', metadataUrl);
    
    const metadataResponse = await fetch(metadataUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': FIREBERRY_API_KEY,
        'accept': 'application/json'
      }
    });

    console.log('Metadata response status:', metadataResponse.status);
    
    if (metadataResponse.ok) {
      const metadataData = await metadataResponse.json();
      console.log('Metadata response:', JSON.stringify(metadataData, null, 2));
      
      // Find the statuscode field and extract its options
      if (metadataData.data && metadataData.data.Fields) {
        const statusField = metadataData.data.Fields.find(field => field.FieldName === 'statuscode');
        console.log('Status field found:', statusField);
        
        if (statusField && statusField.Options) {
          statusOptions = statusField.Options.map(option => ({
            value: option.Value,
            label: option.Label,
            color: option.Color || null
          }));
          console.log('Status options extracted:', statusOptions);
        }
      }
    } else {
      const errorText = await metadataResponse.text();
      console.error('Metadata request failed:', errorText);
      
      // Method 2: Try a query approach to get distinct status values
      console.log('Trying alternative query approach...');
      
      const queryPayload = {
        objecttype: 33,
        page_size: 100,
        fields: "statuscode",
        query: "(statuscode is-not-null)"
      };
      
      console.log('Query payload:', JSON.stringify(queryPayload));
      
      const queryResponse = await fetch('https://api.fireberry.com/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'tokenid': FIREBERRY_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify(queryPayload)
      });
      
      console.log('Query response status:', queryResponse.status);
      
      if (queryResponse.ok) {
        const queryData = await queryResponse.json();
        console.log('Query response:', JSON.stringify(queryData, null, 2));
        
        // Extract unique status codes
        if (queryData.data && queryData.data.Data) {
          const uniqueStatuses = [...new Set(queryData.data.Data.map(record => record.statuscode))];
          console.log('Unique status codes found:', uniqueStatuses);
          
          statusOptions = uniqueStatuses.map(status => ({
            value: status,
            label: `Status ${status}`,
            color: null
          }));
        }
      } else {
        const queryError = await queryResponse.text();
        console.error('Query request also failed:', queryError);
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