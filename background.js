// Enhanced background script with better debugging
console.log('PathUnfold Web Clipper background script loaded');

// Circle API configuration
const CIRCLE_API_BASE = 'https://app.circle.so/api/headless/v1';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "postToCircle") {
    postToCircle(request.data, sendResponse);
    return true;
  }
  
  if (request.action === "testApi") {
    testApiConnection(sendResponse);
    return true;
  }
});

// Function to post to Circle
async function postToCircle(data, sendResponse) {
  try {
    console.log('=== Starting Post to Circle ===');
    console.log('Data:', data);
    
    // Get stored data
    const result = await chrome.storage.sync.get(['accessToken', 'tokenTimestamp', 'email']);
    console.log('Stored data:', { 
      hasToken: !!result.accessToken, 
      tokenAge: result.tokenTimestamp ? Date.now() - result.tokenTimestamp : 0,
      email: result.email 
    });
    
    if (!result.accessToken) {
      sendResponse({ success: false, message: "Please authenticate first" });
      return;
    }
    
    // Check token expiration
    if (result.tokenTimestamp) {
      const tokenAge = Date.now() - result.tokenTimestamp;
      const oneHour = 3600000; // 1 hour in milliseconds
      console.log('Token age:', Math.floor(tokenAge / 1000), 'seconds');
      
      if (tokenAge > oneHour) {
        sendResponse({ success: false, message: "Token expired. Please re-authenticate" });
        return;
      }
    }
    
    // Prepare request data
    const postData = {
      name: data.title,
      body: data.content,
      post_type: "basic"
    };
    
    // Add space_id to the request
    if (data.spaceId) {
      postData.space_id = data.spaceId;
      console.log('Added space_id:', data.spaceId);
    }
    
    console.log('Request data:', postData);
    
    // Try different endpoint formats
    const endpoints = [
      `${CIRCLE_API_BASE}/posts`,
      `${CIRCLE_API_BASE}/spaces/${data.spaceId}/posts`,
      `${CIRCLE_API_BASE}/communities/${data.spaceId}/posts`
    ];
    
    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      console.log(`\n--- Attempt ${i + 1}: ${endpoint} ---`);
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${result.accessToken}`,
            'Accept': 'application/json',
            'User-Agent': 'PathUnfold-Web-Clipper/1.0'
          },
          body: JSON.stringify(postData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const contentType = response.headers.get('content-type');
        console.log('Content-Type:', contentType);
        
        if (contentType && contentType.includes('application/json')) {
          const responseData = await response.json();
          console.log('Response data:', responseData);
          
          if (response.ok || response.status === 201) {
            sendResponse({ 
              success: true, 
              message: `Post created successfully using: ${endpoint}`,
              postId: responseData.id || responseData.post_id,
              endpoint: endpoint
            });
            return;
          } else {
            // Try next endpoint
            console.log('Endpoint failed, trying next...');
            continue;
          }
        } else {
          // Non-JSON response
          const text = await response.text();
          console.error('Non-JSON response:', text.substring(0, 500));
          
          if (i === endpoints.length - 1) {
            sendResponse({ 
              success: false, 
              message: `API Error: All endpoints failed. Last response (Status: ${response.status}):\n${text.substring(0, 500)}` 
            });
            return;
          }
        }
      } catch (endpointError) {
        console.error(`Endpoint ${endpoint} error:`, endpointError);
        
        if (i === endpoints.length - 1) {
          sendResponse({ 
            success: false, 
            message: `Network error: ${endpointError.message}` 
          });
          return;
        }
      }
    }
    
  } catch (error) {
    console.error('Post error:', error);
    sendResponse({ 
      success: false, 
      message: `Error: ${error.message}` 
    });
  }
}

// Test API connection
async function testApiConnection(sendResponse) {
  try {
    const result = await chrome.storage.sync.get(['accessToken']);
    
    if (!result.accessToken) {
      sendResponse({ success: false, message: "No access token" });
      return;
    }
    
    // Test basic API access
    const testResponse = await fetch(`${CIRCLE_API_BASE}/me`, {
      headers: {
        'Authorization': `Bearer ${result.accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (testResponse.ok) {
      const userData = await testResponse.json();
      sendResponse({ 
        success: true, 
        message: "API connection successful",
        user: userData
      });
    } else {
      sendResponse({ 
        success: false, 
        message: `API test failed: ${testResponse.status}` 
      });
    }
  } catch (error) {
    sendResponse({ 
      success: false, 
      message: `Test error: ${error.message}` 
    });
  }
}

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('PathUnfold Web Clipper installed');
  chrome.storage.sync.set({
    backendUrl: 'https://your-project.vercel.app/api/auth'
  });
});

// Create context menu
chrome.contextMenus.create({
  id: 'clipToCircle',
  title: 'Clip to Circle',
  contexts: ['selection', 'image', 'video', 'audio']
});