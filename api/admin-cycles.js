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
    console.log('[Admin Cycles API] Starting admin-cycles API call');
    console.log(`[RateLimiter] Stats: ${JSON.stringify(rateLimiter.getCacheStats())}`);
    
    // Create rate-limited API call functions
    const fetchCycles = async () => {
      const cyclesQuery = {
        objecttype: 1000,
        page_size: 500,
        fields: "customobject1000id,name,pcfsystemfield37,pcfsystemfield549",
        query: "pcfsystemfield37 = 3"
      };
      
      console.log('[Admin Cycles API] Cycles query:', JSON.stringify(cyclesQuery));

      const response = await fetch('https://api.fireberry.com/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'tokenid': FIREBERRY_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify(cyclesQuery)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cycles: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    };

    const fetchRegistrationCounts = async (cycleIds) => {
      const cycleConditions = cycleIds.map(id => `pcfsystemfield53 = '${id}'`).join(' OR ');
      
      const registrationsQuery = {
        objecttype: 33,
        page_size: 2000,
        fields: "pcfsystemfield53",
        query: `(${cycleConditions})`
      };

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
        console.warn(`[Admin Cycles API] Registration counts fetch failed: ${response.status}`);
        return { data: { Data: [] } };
      }

      return await response.json();
    };

    // Step 1: Get all active cycles with rate limiting
    const cyclesCacheKey = 'admin_cycles_active';
    const cyclesData = await circuitBreaker.execute(async () => {
      return await rateLimiter.executeRequest(fetchCycles, cyclesCacheKey, 2); // High priority
    });
    
    if (!cyclesData.data || !cyclesData.data.Data) {
      return res.status(200).json({ 
        cycles: [],
        totalCycles: 0,
        cached: false 
      });
    }

    // Filter cycles by pcfsystemfield549 != "פרטי"
    console.log('All cycles before filtering:', cyclesData.data.Data.map(c => ({
      name: c.name,
      pcfsystemfield549: c.pcfsystemfield549
    })));
    
    const validCycles = cyclesData.data.Data.filter(cycle => {
      const fieldValue = cycle.pcfsystemfield549;
      const trimmedValue = fieldValue ? fieldValue.toString().trim() : '';
      const isValid = trimmedValue !== "פרטי";
      console.log(`Cycle: ${cycle.name}, field549: "${fieldValue}", trimmed: "${trimmedValue}", isValid: ${isValid}`);
      return isValid;
    });
    
    console.log('Valid cycles after filtering:', validCycles.length);

    if (validCycles.length === 0) {
      return res.status(200).json({ 
        cycles: [],
        totalCycles: 0,
        cached: rateLimiter.cache.has(cyclesCacheKey)
      });
    }

    // Step 2: Get all registrations for valid cycles with rate limiting
    const cycleIds = validCycles.map(cycle => cycle.customobject1000id);
    const registrationsCacheKey = `admin_registrations_${cycleIds.sort().join('_')}`;
    
    const registrationsData = await circuitBreaker.execute(async () => {
      return await rateLimiter.executeRequest(() => fetchRegistrationCounts(cycleIds), registrationsCacheKey, 1);
    });

    let registrationCounts = {};
    if (registrationsData.data && registrationsData.data.Data) {
      // Count registrations per cycle
      registrationsData.data.Data.forEach(registration => {
        const cycleId = registration.pcfsystemfield53;
        if (cycleId) {
          registrationCounts[cycleId] = (registrationCounts[cycleId] || 0) + 1;
        }
      });
    }

    // Step 3: Build final result with only cycles that have registrations
    console.log('Registration counts:', registrationCounts);
    
    const cyclesWithRegistrations = validCycles
      .filter(cycle => {
        const count = registrationCounts[cycle.customobject1000id] || 0;
        console.log(`Cycle ${cycle.name}: registrations = ${count}`);
        return count > 0;
      })
      .map(cycle => ({
        id: cycle.customobject1000id,
        name: cycle.name,
        pcfsystemfield549: cycle.pcfsystemfield549,
        count: registrationCounts[cycle.customobject1000id] || 0
      }));
      
    console.log('Final cycles with registrations:', cyclesWithRegistrations.length);

    // Check cache status
    const cyclesCached = rateLimiter.cache.has(cyclesCacheKey);
    const registrationsCached = rateLimiter.cache.has(registrationsCacheKey);

    console.log(`[Admin Cycles API] Returning ${cyclesWithRegistrations.length} cycles (cycles cached: ${cyclesCached}, registrations cached: ${registrationsCached})`);

    res.status(200).json({ 
      cycles: cyclesWithRegistrations,
      totalCycles: cyclesWithRegistrations.length,
      cached: {
        cycles: cyclesCached,
        registrations: registrationsCached,
        overall: cyclesCached && registrationsCached
      },
      timestamp: new Date().toISOString(),
      rateLimiterStats: rateLimiter.getCacheStats(),
      circuitBreakerState: circuitBreaker.getState()
    });

  } catch (error) {
    console.error('[Admin Cycles API] Error:', error);
    
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
      errorMessage = 'Unable to connect to cycles service. Please check your connection and try again.';
      statusCode = 502;
    }

    res.status(statusCode).json({ 
      error: 'Failed to fetch admin cycles',
      message: errorMessage,
      originalError: error.message,
      timestamp: new Date().toISOString(),
      retryAfter: error.message.includes('429') ? 30 : undefined
    });
  }
}