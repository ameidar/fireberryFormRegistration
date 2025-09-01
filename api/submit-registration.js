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

    // Validate required fields (email and childBirthDate are optional)
    if (!parentName || !phoneNumber || !childName || !programCycle) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let customerId = null;
    let customerExists = false;

    // Check if customer already exists by email or phone (only if email is provided)
    if (email) {
      const checkEmailQuery = {
        objecttype: 1,
        page_size: 50,
        fields: "accountid,accountname,emailaddress1,telephone1",
        query: `emailaddress1 = '${email}'`
      };

      const emailResponse = await fetch('https://api.fireberry.com/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'tokenid': FIREBERRY_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify(checkEmailQuery)
      });

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        if (emailData.data && emailData.data.Data && emailData.data.Data.length > 0) {
          customerId = emailData.data.Data[0].accountid;
          customerExists = true;
          console.log('Found existing customer by email:', customerId);
        }
      }
    }

    // If not found by email, check by phone
    if (!customerExists) {
      const checkPhoneQuery = {
        objecttype: 1,
        page_size: 50,
        fields: "accountid,accountname,emailaddress1,telephone1",
        query: `telephone1 = '${phoneNumber}'`
      };

      const phoneResponse = await fetch('https://api.fireberry.com/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'tokenid': FIREBERRY_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify(checkPhoneQuery)
      });

      if (phoneResponse.ok) {
        const phoneData = await phoneResponse.json();
        if (phoneData.data && phoneData.data.Data && phoneData.data.Data.length > 0) {
          customerId = phoneData.data.Data[0].accountid;
          customerExists = true;
          console.log('Found existing customer by phone:', customerId);
        }
      }
    }

    // If customer doesn't exist, create new customer
    if (!customerExists) {
      const customerPayload = {
        accountname: parentName,
        telephone1: phoneNumber
      };
      
      // Only add email if provided
      if (email) {
        customerPayload.emailaddress1 = email;
      }

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
      pcfsystemfield53: programCycle,
      productid: '01333c9a-fb67-4b3f-b293-e71ec55c42b4'
    };
    
    // Only add birth date if provided
    if (childBirthDate) {
      registrationPayload.pcfsystemfield298 = childBirthDate;
    }

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