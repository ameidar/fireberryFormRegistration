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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const FIREBERRY_API_KEY = '8a7dfba2-1e98-4771-9a99-9557ce5db9dd';
    const { parentName, phoneNumber, email, childName, childBirthDate, programCycle } = req.body;

    // Validate required fields
    if (!parentName || !phoneNumber || !email || !childName || !childBirthDate || !programCycle) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create customer record in Fireberry (object type 1)
    const customerPayload = {
      accountname: parentName,
      telephone1: phoneNumber,
      emailaddress1: email
    };

    const customerResponse = await fetch('https://api.fireberry.com/api/record/1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': FIREBERRY_API_KEY,
        'accept': 'application/json'
      },
      body: JSON.stringify(customerPayload)
    });

    if (!customerResponse.ok) {
      const errorText = await customerResponse.text();
      console.error('Customer creation error:', errorText);
      throw new Error(`Failed to create customer: ${customerResponse.status}`);
    }

    const customerData = await customerResponse.json();
    console.log('Customer created:', customerData);

    // Return success response with registration data
    res.status(200).json({
      success: true,
      message: 'רישום נשלח בהצלחה!',
      customerId: customerData.data?.Record?.customobject1id || null,
      registrationData: {
        parentName,
        phoneNumber,
        email,
        childName,
        childBirthDate,
        programCycle
      }
    });

  } catch (error) {
    console.error('Registration submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit registration',
      message: error.message 
    });
  }
}