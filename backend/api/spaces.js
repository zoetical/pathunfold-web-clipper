// Spaces endpoint for fetching available Circle spaces
const { verifyJWT, extractJWTFromRequest } = require('../lib/jwt');
const { getMemberAccessToken, getSpaces } = require('../lib/circle');

module.exports = async (req, res) => {
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
    console.log('=== SPACES REQUEST ===');
    
    // Extract and verify JWT
    let userEmail;
    try {
      const token = extractJWTFromRequest(req);
      const payload = verifyJWT(token);
      userEmail = payload.sub;
      console.log('✓ JWT verified for user:', userEmail);
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid or expired session',
        message: 'Please re-authenticate',
        debug: jwtError.message
      });
    }
    
    console.log('Fetching spaces for user:', userEmail);

    // Get Circle access token for user
    let accessToken;
    try {
      accessToken = await getMemberAccessToken(userEmail);
      console.log('✓ Circle access token obtained');
    } catch (circleError) {
      return res.status(500).json({
        error: 'Failed to authenticate with Circle',
        message: 'Please try again or contact support',
        debug: circleError.message
      });
    }

    // Fetch spaces from Circle
    try {
      const spaces = await getSpaces(accessToken);
      
      console.log('✓ Spaces fetched successfully, count:', spaces.length);
      
      // Transform spaces data for frontend
      const transformedSpaces = spaces.map(space => ({
        id: space.id,
        name: space.name,
        slug: space.slug,
        description: space.description,
        is_private: space.is_private,
        member_count: space.member_count,
        post_count: space.post_count
      }));

      return res.status(200).json({
        success: true,
        spaces: transformedSpaces,
        meta: {
          user: userEmail,
          fetched_at: new Date().toISOString(),
          total_count: transformedSpaces.length
        }
      });

    } catch (spacesError) {
      console.error('Spaces fetch failed:', spacesError.message);
      
      return res.status(500).json({
        error: 'Failed to fetch spaces',
        message: spacesError.message,
        debug: {
          user: userEmail,
          hasAccessToken: !!accessToken
        }
      });
    }

  } catch (error) {
    console.error('Spaces request error:', error);
    
    return res.status(500).json({
      error: 'Spaces request failed',
      message: error.message,
      debug: 'Check server logs for details'
    });
  }
};