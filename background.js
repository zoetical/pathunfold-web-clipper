// Background script for PathUnfold Web Clipper
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "postToCircle") {
    handlePostToCircle(request.data, sendResponse);
    return true; // Keep the message channel open for async response
  }
});

// Function to handle posting to Circle
async function handlePostToCircle(data, sendResponse) {
  try {
    // Get access token from storage
    const storageData = await new Promise((resolve) => {
      chrome.storage.sync.get(['accessToken', 'email', 'tokenTimestamp'], resolve);
    });
    
    if (!storageData.accessToken) {
      sendResponse({
        success: false,
        message: "Please authenticate in settings first"
      });
      return;
    }
    
    // Check if token is expired (1 hour)
    if (storageData.tokenTimestamp) {
      const tokenAge = Date.now() - storageData.tokenTimestamp;
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      
      if (tokenAge > oneHour) {
        sendResponse({
          success: false,
          message: "Access token expired. Please re-authenticate in settings"
        });
        return;
      }
    }
    
    // Prepare post data
    const postData = {
      space_id: data.spaceId,
      name: data.title,
      body: data.content,
      post_type: "basic"
    };
    
    // Make API request to Circle
    const response = await fetch('https://app.circle.so/api/v1/headless/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storageData.accessToken}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(postData)
    });
    
    const responseData = await response.json();
    
    if (response.ok) {
      sendResponse({
        success: true,
        message: "Post created successfully!",
        postId: responseData.id
      });
    } else {
      // Handle specific error messages
      let errorMessage = "Failed to create post";
      
      if (responseData.errors) {
        errorMessage = responseData.errors.map(e => e.message).join(', ');
      } else if (responseData.message) {
        errorMessage = responseData.message;
      } else if (response.status === 401) {
        errorMessage = "Authentication failed. Please re-authenticate in settings";
      } else if (response.status === 403) {
        errorMessage = "Permission denied. Check your Space ID and permissions";
      } else if (response.status === 404) {
        errorMessage = "Space not found. Please check your Space ID";
      } else if (response.status === 422) {
        errorMessage = "Invalid data. Please check all fields";
      }
      
      sendResponse({
        success: false,
        message: errorMessage
      });
    }
  } catch (error) {
    console.error('Error posting to Circle:', error);
    
    let errorMessage = "Network error occurred";
    if (error.message.includes('Failed to fetch')) {
      errorMessage = "Network error: Could not connect to Circle API";
    } else if (error.message.includes('NetworkError')) {
      errorMessage = "Network error: Please check your internet connection";
    }
    
    sendResponse({
      success: false,
      message: errorMessage
    });
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default values on installation
    chrome.storage.sync.set({
      backendUrl: 'https://your-backend.com/auth'
    });
    
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.accessToken) {
    // Token was updated, could be new or cleared
    console.log('Access token updated');
  }
});

// Context menu for quick clipping (optional feature)
chrome.contextMenus.create({
  id: 'clipToCircle',
  title: 'Clip to Circle',
  contexts: ['selection', 'image', 'video', 'audio', 'page']
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'clipToCircle') {
    // Open popup with pre-filled data
    chrome.action.openPopup();
  }
});