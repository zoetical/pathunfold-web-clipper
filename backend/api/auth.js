// Simple Vercel API function for Circle authentication
// Using Node.js 18+ native fetch

module.exports = async (req, res) => {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'CORS preflight successful' });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }
  
  try {
    // Log environment info for debugging (without exposing sensitive data)
    console.log('API function invoked');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.keys(req.headers));
    console.log('Environment check - has CIRCLE_AUTH_TOKEN:', !!process.env.CIRCLE_AUTH_TOKEN);
    
    const { email } = req.body;
    
    if (!email) {
      console.error('No email provided in request body');
      return res.status(400).json({ 
        error: 'Email is required',
        debug: 'Request body missing email field'
      });
    }

    // Check for required environment variable
    const CIRCLE_AUTH_TOKEN = process.env.CIRCLE_AUTH_TOKEN;
    if (!CIRCLE_AUTH_TOKEN) {
      console.error('=== ENVIRONMENT VARIABLE ERROR ===');
      console.error('CIRCLE_AUTH_TOKEN environment variable is not set');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('CIRCLE') || key.includes('TOKEN')));
      console.error('==================================');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'CIRCLE_AUTH_TOKEN environment variable is not configured',
        debug: {
          hasCircleToken: false,
          availableCircleEnvs: Object.keys(process.env).filter(key => key.includes('CIRCLE')),
          note: 'Add CIRCLE_AUTH_TOKEN to your Vercel project environment variables'
        }
      });
    }

    console.log('=== AUTHENTICATION ATTEMPT ===');
    console.log('Email:', email);
    console.log('Token configured:', !!CIRCLE_AUTH_TOKEN);
    console.log('Token length:', CIRCLE_AUTH_TOKEN.length);
    console.log('Token prefix:', CIRCLE_AUTH_TOKEN.substring(0, 10) + '...');
    console.log('==============================');

    const response = await fetch('https://app.circle.so/api/headless/v1/auth_token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CIRCLE_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    console.log('Circle API response status:', response.status);
    console.log('Circle API response headers:', Object.fromEntries(response.headers.entries()));

    // Check if Circle API returned JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('=== CIRCLE API DEBUG ===');
      console.error('Content-Type:', contentType);
      console.error('Response Status:', response.status);
      console.error('Response Headers:', Object.fromEntries(response.headers.entries()));
      console.error('Response Body (first 500 chars):', textResponse.substring(0, 500));
      console.error('Full Response Length:', textResponse.length);
      console.error('========================');
      
      // Check for common HTML error patterns
      let errorMessage = 'Circle API returned invalid response format';
      if (textResponse.includes('<!DOCTYPE html>')) {
        if (textResponse.includes('404')) {
          errorMessage = 'Circle API endpoint not found (404). Check if the API URL has changed.';
        } else if (textResponse.includes('401') || textResponse.includes('Unauthorized')) {
          errorMessage = 'Unauthorized: Circle API token is invalid or expired.';
        } else if (textResponse.includes('403') || textResponse.includes('Forbidden')) {
          errorMessage = 'Forbidden: Circle API token lacks required permissions.';
        } else if (textResponse.includes('500')) {
          errorMessage = 'Circle API server error (500). Try again later.';
        } else {
          errorMessage = 'Circle API returned HTML page instead of JSON data.';
        }
      }
      
      return res.status(502).json({
        error: errorMessage,
        message: 'Circle API did not return JSON',
        debug: {
          contentType,
          status: response.status,
          bodyPreview: textResponse.substring(0, 200),
          hasCircleToken: !!CIRCLE_AUTH_TOKEN,
          tokenLength: CIRCLE_AUTH_TOKEN ? CIRCLE_AUTH_TOKEN.length : 0
        }
      });
    }

    const data = await response.json();
    console.log('Circle API response data keys:', Object.keys(data));

    if (response.ok) {
      // Success - return the access token
      console.log('✓ Authentication successful for:', email);
      return res.status(200).json({
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
      return res.status(response.status).json({
        error: data.error || 'Failed to authenticate with Circle',
        message: data.message || 'Authentication failed',
        details: data
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Ensure we always return JSON
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      debug: 'Check Vercel function logs for details'
    });
  }
};