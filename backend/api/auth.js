// Simple Vercel API function for Circle authentication
// Using Node.js 18+ native fetch

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check for required environment variable
    const CIRCLE_AUTH_TOKEN = process.env.CIRCLE_AUTH_TOKEN;
    if (!CIRCLE_AUTH_TOKEN) {
      console.error('CIRCLE_AUTH_TOKEN environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    console.log('Attempting authentication for:', email);

    const response = await fetch('https://app.circle.so/api/headless/v1/auth_token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CIRCLE_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    console.log('Circle API response status:', response.status);
    console.log('Circle API response:', data);

    if (response.ok) {
      // Success - return the access token
      console.log('✓ Authentication successful for:', email);
      res.status(200).json({
        access_token: data.access_token,
        expires_in: data.expires_in || 3600,
        circle_response: data // Include Circle's response for debugging
      });
    } else {
      // Handle Circle API errors
      console.error('✗ Circle API Error:', {
        status: response.status,
        error: data.error,
        message: data.message,
        full_response: data
      });
      res.status(response.status).json({
        error: data.error || 'Failed to authenticate with Circle',
        message: data.message || 'Authentication failed',
        details: data
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};