// Enhanced background script with better debugging
console.log('PathUnfold Web Clipper background script loaded');

// Circle API configuration
const CIRCLE_API_BASE = 'https://app.circle.so/api/headless/v1';

// Initialize extension
function initializeExtension() {
  console.log('Initializing extension...');
  // Remove existing context menu if it exists
  chrome.contextMenus.remove('clipToCircle', () => {
    if (chrome.runtime.lastError) {
      // Ignore error if menu doesn't exist
      console.log('Context menu removal: ' + chrome.runtime.lastError.message);
    }
    
    // Create new context menu
    chrome.contextMenus.create({
      id: 'clipToCircle',
      title: 'Clip to Circle',
      contexts: ['selection', 'image', 'video', 'audio']
    }, () => {
      if (chrome.runtime.lastError) {
        console.log('Context menu creation error:', chrome.runtime.lastError);
      } else {
        console.log('Context menu created successfully');
      }
    });
  });
}

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
    
    // Enhanced video processing - try to get oEmbed iframe
    let processedContent = data.content;
    
    // Check if content contains video URLs and try to enhance them
    const videoUrlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[^&\s]+|youtu\.be\/[^&\s]+|vimeo\.com\/\d+)[^\s]*)/g;
    const videoMatches = data.content.match(videoUrlRegex);
    
    if (videoMatches) {
      console.log('Found video URLs:', videoMatches);
      
      // Try to get oEmbed data for each video URL
      for (const videoUrl of videoMatches) {
        const oEmbedHtml = await getOEmbedData(videoUrl);
        if (oEmbedHtml) {
          console.log('Got oEmbed HTML for:', videoUrl);
          processedContent = processedContent.replace(videoUrl, oEmbedHtml);
        }
      }
    }
    
    // Prepare request data
    const postData = {
      name: data.title,
      body: processedContent,
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

// Get oEmbed data for video URL
async function getOEmbedData(videoUrl) {
  try {
    // YouTube oEmbed API
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const youtubeId = extractYouTubeId(videoUrl);
      if (youtubeId) {
        const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
        const response = await fetch(oEmbedUrl);
        if (response.ok) {
          const data = await response.json();
          return data.html;
        }
      }
    }
    
    // Vimeo oEmbed API
    if (videoUrl.includes('vimeo.com')) {
      const vimeoId = videoUrl.match(/vimeo\.com\/(\d+)/);
      if (vimeoId) {
        const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId[1]}`;
        const response = await fetch(oEmbedUrl);
        if (response.ok) {
          const data = await response.json();
          return data.html;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('oEmbed fetch error:', error);
    return null;
  }
}

// Extract YouTube ID from URL
function extractYouTubeId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('PathUnfold Web Clipper installed');
  chrome.storage.sync.set({
    backendUrl: 'https://your-project.vercel.app/api/auth'
  });
  
  // Initialize context menu
  initializeExtension();
});

// Initialize on startup (handles extension reload)
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started up');
  initializeExtension();
});

// Also initialize immediately for extension reload scenarios
setTimeout(() => {
  console.log('Delayed initialization');
  initializeExtension();
}, 100);