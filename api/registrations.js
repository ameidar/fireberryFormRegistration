import { rateLimiter, circuitBreaker } from '../utils/rateLimiter.js';

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
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Cycle ID is required' });
    }

    console.log(`[Registrations API] Processing request for cycle: ${cycleId}`);
    console.log(`[RateLimiter] Stats: ${JSON.stringify(rateLimiter.getCacheStats())}`);

    // Create rate-limited API call functions
    const fetchRegistrations = async () => {
      const registrationsQuery = {
        objecttype: 33,
        page_size: 500,
        fields: "accountproductid,accountid,pcfsystemfield204,pcfsystemfield53,statuscode,pcfsystemfield56,pcfsystemfield289",
        query: `pcfsystemfield53 = ${cycleId}`
      };

      console.log('[Registrations API] Registration query:', JSON.stringify(registrationsQuery, null, 2));

      const response = await fetch('https://api.fireberry.com/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'tokenid': FIREBERRY_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify(registrationsQuery)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch registrations: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    };

    const fetchCustomers = async (accountIds) => {
      const accountConditions = accountIds.map(id => `(accountid = '${id}')`).join(' OR ');
      
      const customersQuery = {
        objecttype: 1,
        page_size: 500,
        fields: "accountid,accountname,telephone1",
        query: `(${accountConditions})`
      };

      const response = await fetch('https://api.fireberry.com/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'tokenid': FIREBERRY_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify(customersQuery)
      });

      if (!response.ok) {
        console.warn(`[Registrations API] Customer fetch failed: ${response.status}`);
        return { data: { Data: [] } };
      }

      return await response.json();
    };

    // Execute registrations query with rate limiting and circuit breaker
    const registrationsCacheKey = `registrations_${cycleId}`;
    const registrationsData = await circuitBreaker.execute(async () => {
      return await rateLimiter.executeRequest(fetchRegistrations, registrationsCacheKey, 1);
    });

    if (!registrationsData.data || !registrationsData.data.Data) {
      return res.status(200).json({ 
        registrations: [],
        cycleId: cycleId,
        count: 0,
        cached: false
      });
    }

    const registrations = registrationsData.data.Data;

    // Get unique account IDs to fetch customer names
    const accountIds = [...new Set(registrations.map(reg => reg.accountid).filter(id => id))];
    
    if (accountIds.length === 0) {
      return res.status(200).json({ 
        registrations: [],
        cycleId: cycleId,
        count: 0,
        cached: false
      });
    }

    // Execute customers query with rate limiting (lower priority than registrations)
    const customersCacheKey = `customers_${accountIds.sort().join('_')}`;
    const customersData = await circuitBreaker.execute(async () => {
      return await rateLimiter.executeRequest(() => fetchCustomers(accountIds), customersCacheKey, 0);
    });

    let customerMap = {};
    let phoneMap = {};
    if (customersData.data && customersData.data.Data) {
      customersData.data.Data.forEach(customer => {
        customerMap[customer.accountid] = customer.accountname;
        phoneMap[customer.accountid] = customer.telephone1;
      });
    }

    // Transform registrations with customer names
    const transformedRegistrations = registrations.map(registration => ({
      registrationId: registration.accountproductid,
      accountId: registration.accountid,
      accountName: customerMap[registration.accountid] || registration.accountid,
      phoneNumber: phoneMap[registration.accountid] || 'לא נמצא',
      childName: registration.pcfsystemfield204 || 'לא נמצא',
      statusCode: registration.statuscode,
      cycleId: registration.pcfsystemfield53,
      paymentStatus: registration.pcfsystemfield56,
      paymentAmount: registration.pcfsystemfield289
    }));

    // Check if response was served from cache
    const isCached = rateLimiter.cache.has(registrationsCacheKey);

    console.log(`[Registrations API] Returning ${transformedRegistrations.length} registrations for cycle ${cycleId} (cached: ${isCached})`);

    res.status(200).json({ 
      registrations: transformedRegistrations,
      cycleId: cycleId,
      count: transformedRegistrations.length,
      cached: isCached,
      timestamp: new Date().toISOString(),
      rateLimiterStats: rateLimiter.getCacheStats(),
      circuitBreakerState: circuitBreaker.getState()
    });

  } catch (error) {
    console.error('[Registrations API] Error:', error);
    
    // Provide more context for rate limiting errors
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      errorMessage = 'API rate limit exceeded. Please wait a moment and try again.';
      statusCode = 429;
    } else if (error.message.includes('Circuit breaker is OPEN')) {
      errorMessage = 'Service temporarily unavailable due to repeated errors. Please try again in a few moments.';
      statusCode = 503;
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Unable to connect to registration service. Please check your connection and try again.';
      statusCode = 502;
    }

    res.status(statusCode).json({ 
      error: 'Failed to fetch registrations',
      message: errorMessage,
      originalError: error.message,
      timestamp: new Date().toISOString(),
      retryAfter: error.message.includes('429') ? 30 : undefined // Suggest retry after 30 seconds for rate limits
    });
  }
}