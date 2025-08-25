// Vercel API function for Circle authentication
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Check for required environment variable
  const CIRCLE_AUTH_TOKEN = process.env.CIRCLE_AUTH_TOKEN;
  if (!CIRCLE_AUTH_TOKEN) {
    console.error('CIRCLE_AUTH_TOKEN environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch('https://app.circle.so/api/v1/headless/auth_token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CIRCLE_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (response.ok) {
      // Success - return the access token
      res.status(200).json({
        success: true,
        access_token: data.access_token,
        expires_in: data.expires_in || 3600 // Default 1 hour
      });
    } else {
      // Handle Circle API errors
      console.error('Circle API Error:', data);
      res.status(response.status).json({
        success: false,
        error: data.error || 'Failed to authenticate with Circle'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};