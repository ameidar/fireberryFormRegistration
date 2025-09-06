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
    
    // Get active cycles using secure client
    const cyclesData = await client.getActiveCycles();
    
    // Transform and sanitize data for frontend (no sensitive internal fields)
    const cycles = cyclesData.map(cycle => ({
      id: cycle.customobject1000id,
      name: cycle.name,
      type: cycle.pcfsystemfield549 || 'Unknown'
    }));

    res.status(200).json({ cycles });
  } catch (error) {
    console.error('Error fetching cycles:', error);
    
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (error instanceof FireberryAPIError) {
      res.status(error.status || 500).json({
        error: 'Failed to fetch cycles',
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