// Preview endpoint for Iframely integration and link preview
const { getIframelyPreview } = require('../lib/iframely');
const { verifyJWT, extractJWTFromRequest } = require('../lib/jwt');
const { 
  handleApiError,
  validateUrl,
  checkRateLimit,
  logRequest,
  AuthenticationError
} = require('../lib/utils');

module.exports = async (req, res) => {
  const startTime = Date.now();
  
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'CORS preflight successful' });
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }
  
  try {
    console.log('=== PREVIEW REQUEST ===');
    logRequest(req, startTime);
    
    // Extract and verify JWT
    let userEmail;
    try {
      const token = extractJWTFromRequest(req);
      const payload = verifyJWT(token);
      userEmail = payload.sub;
      console.log('✓ JWT verified for user:', userEmail);
    } catch (jwtError) {
      throw new AuthenticationError('Invalid or expired session. Please re-authenticate.');
    }
    
    // Rate limiting per user
    checkRateLimit(`preview:${userEmail}`, 30, 5 * 60 * 1000); // 30 requests per 5 minutes
    
    const { url } = req.query;
    
    // Validate URL
    const validatedUrl = validateUrl(url);
    
    console.log('Getting preview for URL:', validatedUrl);
    console.log('Requested by user:', userEmail);

    // Get preview data from Iframely (with caching)
    const preview = await getIframelyPreview(validatedUrl);
    
    console.log('✓ Preview generated successfully');
    
    return res.status(200).json({
      success: true,
      preview,
      meta: {
        requested_by: userEmail,
        requested_at: new Date().toISOString(),
        cache_status: preview.source === 'iframely' ? 'miss' : 'hit'
      }
    });

  } catch (error) {
    return handleApiError(error, res);
  }
};