// Popup script for PathUnfold Web Clipper
document.addEventListener('DOMContentLoaded', () => {
  const authStatus = document.getElementById('authStatus');
  const clipForm = document.getElementById('clipForm');
  const titleInput = document.getElementById('title');
  const contentInput = document.getElementById('content');
  const spaceIdInput = document.getElementById('spaceId');
  const postButton = document.getElementById('postButton');
  const statusDiv = document.getElementById('status');
  const previewDiv = document.getElementById('preview');
  const previewContent = document.getElementById('previewContent');
  
  // Default space ID
  const DEFAULT_SPACE_ID = '2175665';
  
  // Check authentication status
  chrome.storage.sync.get(['accessToken', 'email'], (data) => {
    if (data.accessToken) {
      authStatus.className = 'auth-status authenticated';
      authStatus.innerHTML = `✓ Authenticated as ${data.email || 'user'}`;
      clipForm.style.display = 'block';
      loadClipData();
    } else {
      authStatus.className = 'auth-status not-authenticated';
      authStatus.innerHTML = 'Not authenticated. <a href="#" id="settingsLink">Click here to authenticate</a>.';
      clipForm.style.display = 'none';
      
      // Re-attach event listener for settings link
      document.getElementById('settingsLink').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
      });
    }
  });
  
  // Set space ID (use saved if available, otherwise use default)
  chrome.storage.sync.get(['spaceId'], (data) => {
    if (data.spaceId) {
      spaceIdInput.value = data.spaceId;
    } else {
      spaceIdInput.value = DEFAULT_SPACE_ID;
    }
  });
  
  // Load clip data from current page
  function loadClipData() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "getClipData"}, (response) => {
        if (response) {
          titleInput.value = response.title;
          
          // Format content as HTML
          let bodyContent = '';
          
          // Add selected text or description
          if (response.content && response.content !== "No content selected") {
            bodyContent += `<p>${escapeHtml(response.content)}</p>`;
          }
          
          // Add source link
          bodyContent += `<p>Source: <a href="${response.url}">${response.url}</a></p>`;
          
          // Add image if found
          if (response.imageUrl) {
            bodyContent += `<p><img src="${response.imageUrl}" alt="Clipped Image" style="max-width:100%;"></p>`;
          }
          
          // Add media if found (video/audio)
          if (response.mediaUrl) {
            if (response.mediaType === 'video') {
              // Format video URL for better oEmbed support
              const formattedVideoUrl = formatVideoUrl(response.mediaUrl);
              bodyContent += `<p>${formattedVideoUrl}</p>`; // Circle will auto-embed via oEmbed
            } else {
              bodyContent += `<p>${response.mediaUrl}</p>`;
            }
          }
          
          contentInput.value = bodyContent;
          
          // Show preview
          previewContent.innerHTML = bodyContent;
          previewDiv.style.display = 'block';
        }
      });
    });
  }
  
  // Post to Circle
  postButton.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const spaceId = spaceIdInput.value.trim();
    
    if (!title || !content) {
      showStatus('Please fill in title and content', 'error');
      return;
    }
    
    // Disable button and show loading
    postButton.disabled = true;
    postButton.textContent = 'Posting...';
    showStatus('Posting to Circle...', 'info');
    
    // Save space ID for future use (ensure we always have a valid space ID)
    const spaceIdToSave = spaceId || DEFAULT_SPACE_ID;
    chrome.storage.sync.set({spaceId: spaceIdToSave});
    
    // Send message to background script to post
    chrome.runtime.sendMessage({
      action: "postToCircle",
      data: { title, content, spaceId }
    }, (response) => {
      console.log('Response received:', response);
      
      // Re-enable button
      postButton.disabled = false;
      postButton.textContent = 'Post to Circle';
      
      // Check for communication errors
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        showStatus('✗ Extension communication error. Please reload the extension.', 'error');
        return;
      }
      
      // Check if response exists
      if (!response) {
        console.error('No response received from background script');
        showStatus('✗ No response from extension. Please try again or reload the extension.', 'error');
        return;
      }
      
      if (response.success) {
        showStatus('✓ Posted successfully!', 'success');
        // Clear form after successful post
        setTimeout(() => {
          titleInput.value = '';
          contentInput.value = '';
          previewDiv.style.display = 'none';
          showStatus('', '');
        }, 2000);
      } else {
        const errorMsg = response.message || 'Unknown error occurred';
        showStatus('✗ Error: ' + errorMsg, 'error');
        
        // Show debug info if available
        if (response.debug) {
          console.log('Debug info:', response.debug);
        }
      }
    });
  });
  
  // Show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type ? type : '';
    if (!message) {
      statusDiv.style.display = 'none';
    } else {
      statusDiv.style.display = 'block';
    }
  }
  
  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Live preview update
  contentInput.addEventListener('input', () => {
    previewContent.innerHTML = contentInput.value;
    if (contentInput.value) {
      previewDiv.style.display = 'block';
    } else {
      previewDiv.style.display = 'none';
    }
  });
  
  // Format video URL for better oEmbed support
  function formatVideoUrl(url) {
    // YouTube URL normalization
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const youtubeId = extractYouTubeId(url);
      if (youtubeId) {
        return `https://www.youtube.com/watch?v=${youtubeId}`;
      }
    }
    
    // Vimeo URL normalization
    if (url.includes('vimeo.com')) {
      const vimeoId = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoId) {
        return `https://vimeo.com/${vimeoId[1]}`;
      }
    }
    
    // Return original URL if no normalization needed
    return url;
  }
  
  // Extract YouTube ID from URL
  function extractYouTubeId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
});