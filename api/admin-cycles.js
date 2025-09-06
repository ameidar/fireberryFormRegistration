const { getFireberryClient, FireberryAPIError } = require('../lib/utils/fireberryClient');
const { applySecurity } = require('../lib/middleware/security');

export default async function handler(req, res) {
  // Apply security middleware
  try {
    await new Promise((resolve, reject) => {
      applySecurity(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    return; // Response already sent by security middleware
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = getFireberryClient();
    
    // Step 1: Get all active cycles using secure client
    const cyclesData = await client.getActiveCycles();
    
    if (cyclesData.length === 0) {
      return res.status(200).json({ cycles: [], totalCycles: 0 });
    }

    // Filter cycles by type (exclude "פרטי" - private cycles)
    const validCycles = cyclesData.filter(cycle => {
      const fieldValue = cycle.pcfsystemfield549;
      const trimmedValue = fieldValue ? fieldValue.toString().trim() : '';
      return trimmedValue !== "פרטי";
    });
    
    if (validCycles.length === 0) {
      return res.status(200).json({ cycles: [], totalCycles: 0 });
    }

    // Step 2: Get all registrations for valid cycles using batch query (performance optimization)
    const cycleIds = validCycles.map(cycle => cycle.customobject1000id);
    const registrations = await client.getRegistrationsBatch(cycleIds);
    
    // Count registrations per cycle
    const registrationCounts = {};
    registrations.forEach(registration => {
      const cycleId = registration.pcfsystemfield53;
      if (cycleId) {
        registrationCounts[cycleId] = (registrationCounts[cycleId] || 0) + 1;
      }
    });

    // Step 3: Build final result with only cycles that have registrations (sanitized output)
    const cyclesWithRegistrations = validCycles
      .filter(cycle => {
        const count = registrationCounts[cycle.customobject1000id] || 0;
        return count > 0;
      })
      .map(cycle => ({
        id: cycle.customobject1000id,
        name: cycle.name,
        type: cycle.pcfsystemfield549 || 'Unknown',
        count: registrationCounts[cycle.customobject1000id] || 0
      }));

    res.status(200).json({ 
      cycles: cyclesWithRegistrations,
      totalCycles: cyclesWithRegistrations.length 
    });

  } catch (error) {
    console.error('Error fetching admin cycles:', error);
    
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (error instanceof FireberryAPIError) {
      res.status(error.status || 500).json({
        error: 'Failed to fetch admin cycles',
        message: isDevelopment ? error.message : 'Unable to retrieve cycle data'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'An unexpected error occurred'
      });
    }
  }
}