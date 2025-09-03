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
    const { accountId, accountName, phoneNumber } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    // Build update payload
    const updatePayload = {};
    
    if (accountName !== undefined) {
      updatePayload.accountname = accountName;
    }
    
    if (phoneNumber !== undefined) {
      updatePayload.telephone1 = phoneNumber;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Update customer record in Fireberry (objecttype 1)
    const updateResponse = await fetch(`https://api.fireberry.com/api/record/1/${accountId}`, {
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
      console.error('Customer update error:', errorText);
      throw new Error(`Failed to update customer: ${updateResponse.status}`);
    }

    const updateData = await updateResponse.json();

    res.status(200).json({
      success: true,
      message: 'פרטי הלקוח עודכנו בהצלחה!',
      accountId: accountId,
      updatedData: updateData
    });

  } catch (error) {
    console.error('Customer update error:', error);
    res.status(500).json({ 
      error: 'Failed to update customer',
      message: error.message 
    });
  }
}