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
    // Return predefined status options (sanitized, no API exploration)
    const statusOptions = [
      { value: 4, label: 'חדש', color: '#2196F3' },
      { value: 8, label: 'נרשם', color: '#4CAF50' },
      { value: 22, label: 'נרשם חיצוני', color: '#4CAF50' },
      { value: 9, label: 'ביטל', color: '#F44336' },
      { value: 23, label: 'מחכה לשיבוץ', color: '#00BCD4' },
      { value: 10, label: 'פולואפ', color: '#8BC34A' },
      { value: 11, label: 'הוזמנו לשיעור נסיון', color: '#FF9800' },
      { value: 18, label: 'סיים', color: '#9C27B0' }
    ];

    res.status(200).json({ 
      statusOptions: statusOptions
    });

  } catch (error) {
    console.error('Error fetching status options:', error);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      error: 'Internal server error',
      message: isDevelopment ? error.message : 'An unexpected error occurred'
    });
  }
}