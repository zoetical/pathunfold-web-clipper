// Circle API endpoint tester
// Based on Circle Headless Member API documentation

// Base URL from official docs
const BASE_URL = 'https://app.circle.so/api/headless/v1';

// Possible post endpoints (based on common REST patterns)
const POSSIBLE_POST_ENDPOINTS = [
  `${BASE_URL}/posts`,
  `${BASE_URL}/spaces/{space_id}/posts`,
  `${BASE_URL}/communities/{community_id}/posts`,
  `${BASE_URL}/members/me/posts`,
  'https://app.circle.so/api/v1/headless/posts',
  'https://app.circle.so/api/headless/v1/posts'
];

// Test function to find the correct endpoint
async function findCorrectEndpoint(spaceId, accessToken) {
  const testData = {
    name: "API Test Post",
    body: "This is a test post to find the correct endpoint",
    post_type: "basic"
  };
  
  for (const endpoint of POSSIBLE_POST_ENDPOINTS) {
    let url = endpoint;
    
    // Replace {space_id} if present
    if (url.includes('{space_id}')) {
      url = url.replace('{space_id}', spaceId);
    }
    
    console.log(`Testing endpoint: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(testData)
      });
      
      console.log(`Status: ${response.status}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Response:', data);
        
        if (response.status === 201 || response.status === 200) {
          console.log('✓ Found working endpoint:', url);
          return url;
        }
      } else {
        const text = await response.text();
        console.log('Non-JSON response:', text.substring(0, 200));
      }
    } catch (error) {
      console.error('Error testing endpoint:', error.message);
    }
    
    console.log('---');
  }
  
  return null;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { findCorrectEndpoint, POSSIBLE_POST_ENDPOINTS };
}