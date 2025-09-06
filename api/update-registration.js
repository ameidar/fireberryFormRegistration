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

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const FIREBERRY_API_KEY = process.env.FIREBERRY_API_KEY;
    const { registrationId, childName, statusCode } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: 'Registration ID is required' });
    }

    // Build update payload
    const updatePayload = {};
    
    if (childName !== undefined) {
      updatePayload.pcfsystemfield204 = childName;
    }
    
    if (statusCode !== undefined) {
      updatePayload.statuscode = statusCode;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Update registration record in Fireberry
    const updateResponse = await fetch(`https://api.fireberry.com/api/record/33/${registrationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': FIREBERRY_API_KEY,
        'accept': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Registration update error:', errorText);
      throw new Error(`Failed to update registration: ${updateResponse.status}`);
    }

    const updateData = await updateResponse.json();

    res.status(200).json({
      success: true,
      message: 'רישום עודכן בהצלחה!',
      registrationId: registrationId,
      updatedData: updateData
    });

  } catch (error) {
    console.error('Registration update error:', error);
    res.status(500).json({ 
      error: 'Failed to update registration',
      message: error.message 
    });
  }
}