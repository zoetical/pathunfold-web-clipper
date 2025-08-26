// Enhanced Vercel API function for Circle authentication with JWT session management
// Using Node.js 18+ native fetch
const { createJWT } = require('../lib/jwt');
const { getMemberAccessToken } = require('../lib/circle');
const { 
  handleApiError, 
  validateEmail, 
  checkRateLimit, 
  logRequest,
  validateEnvironment 
} = require('../lib/utils');

module.exports = async (req, res) => {
  const startTime = Date.now();
  
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
    // Validate environment on startup
    validateEnvironment();
    
    console.log('=== AUTHENTICATION REQUEST ===');
    logRequest(req, startTime);
    
    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    checkRateLimit(`auth:${clientIp}`, 10, 15 * 60 * 1000); // 10 requests per 15 minutes
    
    const { email } = req.body;
    
    // Validate email
    const validatedEmail = validateEmail(email);
    
    console.log('Email validation passed for:', validatedEmail);

    // Test Circle API connection and get access token (this validates the user exists)
    try {
      const circleToken = await getMemberAccessToken(validatedEmail);
      console.log('✓ Circle API validation successful for:', validatedEmail);
      
      // Create JWT session token (don't include Circle token in JWT)
      const sessionJWT = createJWT({
        sub: validatedEmail,
        type: 'session',
        iss: 'pathunfold-clipper'
      });

      console.log('✓ JWT session token created for:', validatedEmail);
      
      return res.status(200).json({
        session_token: sessionJWT,
        expires_in: 24 * 60 * 60, // 24 hours
        message: 'Authentication successful'
      });
      
    } catch (circleError) {
      console.error('Circle API validation failed:', circleError.message);
      
      let errorMessage = 'Authentication failed';
      let statusCode = 401;
      
      if (circleError.status === 404) {
        errorMessage = 'Email not found in Circle community';
      } else if (circleError.status === 401 || circleError.status === 403) {
        errorMessage = 'Server authentication error. Please contact support.';
        statusCode = 500;
      } else if (circleError.message.includes('configuration')) {
        errorMessage = 'Server configuration error. Please contact support.';
        statusCode = 500;
      }
      
      return res.status(statusCode).json({
        error: errorMessage,
        debug: circleError.message
      });
    }

  } catch (error) {
    return handleApiError(error, res);
  }
};