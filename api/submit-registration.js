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
    const FIREBERRY_API_KEY = process.env.FIREBERRY_API_KEY;
    const { parentName, phoneNumber, email, childName, childBirthDate, programCycle } = req.body;

    // Validate required fields
    if (!parentName || !phoneNumber || !email || !childName || !childBirthDate || !programCycle) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if customer already exists by email or phone
    const checkEmailQuery = {
      objecttype: 1,
      page_size: 50,
      fields: "accountid,accountname,emailaddress1,telephone1",
      query: `emailaddress1 = '${email}'`
    };

    const checkPhoneQuery = {
      objecttype: 1,
      page_size: 50,
      fields: "accountid,accountname,emailaddress1,telephone1",
      query: `telephone1 = '${phoneNumber}'`
    };

    console.log('Checking email query:', JSON.stringify(checkEmailQuery));
    console.log('Checking phone query:', JSON.stringify(checkPhoneQuery));

    const [emailResponse, phoneResponse] = await Promise.all([
      fetch('https://api.fireberry.com/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'tokenid': FIREBERRY_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify(checkEmailQuery)
      }),
      fetch('https://api.fireberry.com/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'tokenid': FIREBERRY_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify(checkPhoneQuery)
      })
    ]);

    if (!emailResponse.ok) {
      console.error('Email check failed:', await emailResponse.text());
    }
    if (!phoneResponse.ok) {
      console.error('Phone check failed:', await phoneResponse.text());
    }

    const emailData = await emailResponse.json();
    const phoneData = await phoneResponse.json();
    
    console.log('Email check result:', JSON.stringify(emailData));
    console.log('Phone check result:', JSON.stringify(phoneData));

    let customerId = null;
    let customerExists = false;

    // Check if customer exists by email or phone
    if (emailData.data && emailData.data.Data && emailData.data.Data.length > 0) {
      customerId = emailData.data.Data[0].accountid;
      customerExists = true;
      console.log('Found existing customer by email:', customerId);
    } else if (phoneData.data && phoneData.data.Data && phoneData.data.Data.length > 0) {
      customerId = phoneData.data.Data[0].accountid;
      customerExists = true;
      console.log('Found existing customer by phone:', customerId);
    }

    // If customer doesn't exist, create new customer
    if (!customerExists) {
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
      customerId = customerData.data?.Record?.accountid;
      console.log('New customer created:', customerId);
    } else {
      console.log('Using existing customer:', customerId);
    }

    // Create registration record (object type 33)
    const registrationPayload = {
      accountid: customerId,
      pcfsystemfield204: childName,
      pcfsystemfield53: programCycle
    };

    const registrationResponse = await fetch('https://api.fireberry.com/api/record/33', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tokenid': FIREBERRY_API_KEY,
        'accept': 'application/json'
      },
      body: JSON.stringify(registrationPayload)
    });

    if (!registrationResponse.ok) {
      const errorText = await registrationResponse.text();
      console.error('Registration creation error:', errorText);
      throw new Error(`Failed to create registration: ${registrationResponse.status}`);
    }

    const registrationData = await registrationResponse.json();
    console.log('Registration created:', registrationData);

    // Return success response
    res.status(200).json({
      success: true,
      message: customerExists ? 'רישום נשלח בהצלחה! הלקוח הקיים עודכן.' : 'רישום נשלח בהצלחה! לקוח חדש נרשם.',
      customerId: customerId,
      registrationId: registrationData.data?.Record?.accountproductid || null,
      customerExists: customerExists,
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