// Debug version of background.js for testing different API endpoints
console.log('PathUnfold Web Clipper background script loaded');

// API endpoints to try
const API_ENDPOINTS = [
  'https://app.circle.so/api/v1/headless/posts',
  'https://app.circle.so/api/headless/v1/posts',
  'https://app.circle.so/api/v1/headless/posts/'
];

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "postToCircle") {
    postToCircle(request.data, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (request.action === "testEndpoints") {
    testAllEndpoints(request.data, sendResponse);
    return true;
  }
});

// Function to post to Circle
async function postToCircle(data, sendResponse) {
  try {
    console.log('Posting to Circle:', data);
    
    // Get stored data
    const result = await chrome.storage.sync.get(['accessToken', 'tokenTimestamp']);
    
    if (!result.accessToken) {
      sendResponse({ success: false, message: "Please authenticate first" });
      return;
    }
    
    // Check token expiration
    if (result.tokenTimestamp) {
      const tokenAge = Date.now() - result.tokenTimestamp;
      if (tokenAge > 3600000) { // 1 hour
        sendResponse({ success: false, message: "Token expired. Please re-authenticate" });
        return;
      }
    }
    
    // Prepare request
    const postData = {
      space_id: data.spaceId,
      name: data.title,
      body: data.content,
      post_type: "basic"
    };
    
    // Try the main endpoint first
    await tryApiEndpoint(API_ENDPOINTS[0], postData, result.accessToken, sendResponse);
    
  } catch (error) {
    console.error('Post error:', error);
    sendResponse({ 
      success: false, 
      message: "Network error: " + error.message 
    });
  }
}

// Try different API endpoints
async function tryApiEndpoint(endpoint, postData, token, sendResponse, index = 0) {
  if (index >= API_ENDPOINTS.length) {
    sendResponse({ 
      success: false, 
      message: "All API endpoints failed. Please check your Circle configuration." 
    });
    return;
  }
  
  const apiUrl = API_ENDPOINTS[index];
  console.log(`Trying endpoint ${index + 1}: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(postData)
    });
    
    console.log(`Endpoint ${index + 1} response status:`, response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`Endpoint ${index + 1} returned non-JSON:`, text.substring(0, 200));
      
      if (index < API_ENDPOINTS.length - 1) {
        // Try next endpoint
        await tryApiEndpoint(API_ENDPOINTS[index + 1], postData, token, sendResponse, index + 1);
      } else {
        sendResponse({ 
          success: false, 
          message: `All endpoints failed. Last response (Status: ${response.status}):\n${text.substring(0, 500)}` 
        });
      }
      return;
    }
    
    if (response.ok) {
      const responseData = await response.json();
      console.log(`Endpoint ${index + 1} success:`, responseData);
      sendResponse({ 
        success: true, 
        message: `Posted successfully using: ${apiUrl}`,
        postId: responseData.id 
      });
    } else {
      const errorData = await response.json();
      console.error(`Endpoint ${index + 1} error:`, errorData);
      
      if (index < API_ENDPOINTS.length - 1) {
        // Try next endpoint
        await tryApiEndpoint(API_ENDPOINTS[index + 1], postData, token, sendResponse, index + 1);
      } else {
        let errorMsg = "Failed to post";
        if (errorData.message) errorMsg = errorData.message;
        if (errorData.errors && errorData.errors.length > 0) errorMsg = errorData.errors[0].message;
        if (errorData.error) errorMsg = errorData.error;
        
        sendResponse({ 
          success: false, 
          message: `All endpoints failed. Last error: ${errorMsg}` 
        });
      }
    }
  } catch (error) {
    console.error(`Endpoint ${index + 1} network error:`, error);
    
    if (index < API_ENDPOINTS.length - 1) {
      // Try next endpoint
      await tryApiEndpoint(API_ENDPOINTS[index + 1], postData, token, sendResponse, index + 1);
    } else {
      sendResponse({ 
        success: false, 
        message: `All endpoints failed. Last network error: ${error.message}` 
      });
    }
  }
}

// Test all endpoints (for debugging)
async function testAllEndpoints(data, sendResponse) {
  const result = await chrome.storage.sync.get(['accessToken']);
  
  if (!result.accessToken) {
    sendResponse({ success: false, message: "No access token found" });
    return;
  }
  
  const results = [];
  
  for (let i = 0; i < API_ENDPOINTS.length; i++) {
    const endpoint = API_ENDPOINTS[i];
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${result.accessToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          space_id: data.spaceId,
          name: "Test Post",
          body: "This is a test",
          post_type: "basic"
        })
      });
      
      const contentType = response.headers.get('content-type');
      results.push({
        endpoint: endpoint,
        status: response.status,
        contentType: contentType,
        isJson: contentType && contentType.includes('application/json')
      });
    } catch (error) {
      results.push({
        endpoint: endpoint,
        error: error.message
      });
    }
  }
  
  sendResponse({ results });
}

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('PathUnfold Web Clipper installed');
  chrome.storage.sync.set({
    backendUrl: 'https://your-project.vercel.app/api/auth'
  });
});