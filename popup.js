// Popup script for PathUnfold Web Clipper
document.addEventListener('DOMContentLoaded', () => {
  const notAuthenticatedMessage = document.getElementById('notAuthenticatedMessage');
  const clipForm = document.getElementById('clipForm');
  const titleInput = document.getElementById('title');
  const contentInput = document.getElementById('content');
  const spaceIdInput = document.getElementById('spaceId');
  const postButton = document.getElementById('postButton');
  const statusDiv = document.getElementById('status');
  const previewDiv = document.getElementById('preview');
  const previewContent = document.getElementById('previewContent');
  const previewThumbnail = document.getElementById('previewThumbnail');
  const previewUrl = document.getElementById('previewUrl');
  const previewMetadata = document.getElementById('previewMetadata');
  const gearIcon = document.getElementById('gearIcon');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const logoutBtn = document.getElementById('logoutBtn');
  
  // Default space ID
  const DEFAULT_SPACE_ID = '2175665';
  
  // Check authentication status
  chrome.storage.sync.get(['sessionToken', 'email', 'backendUrl'], (data) => {
    if (data.sessionToken) {
      notAuthenticatedMessage.style.display = 'none';
      clipForm.style.display = 'block';
      
      // Store backend URL for API calls
      window.backendUrl = data.backendUrl || 'https://pathunfold-web-clipper-backend-2qehostvz-mins-projects-ac9e45c3.vercel.app/api';
      window.sessionToken = data.sessionToken;
      
      loadClipData();
    } else {
      notAuthenticatedMessage.style.display = 'block';
      clipForm.style.display = 'none';
      
      // Attach event listener for settings link
      document.getElementById('settingsLink').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
      });
    }
  });
  
  // Gear icon click handler to toggle dropdown
  gearIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });
  
  // Logout button click handler
  logoutBtn.addEventListener('click', () => {
    // Clear all stored authentication data immediately
    chrome.storage.sync.remove(['sessionToken', 'email'], () => {
      // Show not authenticated message and hide clip form
      notAuthenticatedMessage.style.display = 'block';
      clipForm.style.display = 'none';
      
      // Clear form data
      titleInput.value = '';
      contentInput.value = '';
      previewDiv.style.display = 'none';
      statusDiv.style.display = 'none';
      
      // Clear global variables
      window.backendUrl = null;
      window.sessionToken = null;
      
      // Hide dropdown menu
      dropdownMenu.classList.remove('show');
      
      // Re-attach event listener for settings link after logout
      document.getElementById('settingsLink').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
      });
    });
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!gearIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('show');
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
  
  // Load clip data from current page and get preview
  async function loadClipData() {
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "getClipData"}, async (response) => {
        if (response) {
          titleInput.value = response.title;
          
          // Get preview data from backend if URL is available
          let preview = null;
          if (response.url && window.sessionToken && window.backendUrl) {
            try {
              showStatus('Loading preview...', 'info');
              preview = await getUrlPreview(response.url);
              console.log('Preview loaded:', preview);
            } catch (previewError) {
              console.warn('Preview loading failed:', previewError.message);
            }
          }
          
          // Format content using enhanced strategy
          const formattedContent = formatContentForDisplay(response, preview);
          contentInput.value = formattedContent;
          
          // Show enhanced preview
          showEnhancedPreview(response, preview);
          
          // Hide status if showing preview loading
          if (statusDiv.textContent.includes('Loading preview')) {
            statusDiv.style.display = 'none';
          }
        }
      });
    });
  }
  
  // Get URL preview from backend
  async function getUrlPreview(url) {
    if (!window.sessionToken || !window.backendUrl) {
      throw new Error('Not authenticated');
    }
    
    const previewUrl = `${window.backendUrl}/preview?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(previewUrl, {
      headers: {
        'Authorization': `Bearer ${window.sessionToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Preview API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.preview;
  }
  
  // Show enhanced preview with thumbnail and metadata
  function showEnhancedPreview(clipData, preview) {
    // Clear previous preview content
    previewContent.innerHTML = '';
    previewThumbnail.innerHTML = '';
    previewUrl.innerHTML = '';
    previewMetadata.innerHTML = '';
    
    // Show main content
    if (clipData.content && clipData.content !== "No content selected") {
      const contentDiv = document.createElement('div');
      contentDiv.textContent = clipData.content.substring(0, 200) + (clipData.content.length > 200 ? '...' : '');
      previewContent.appendChild(contentDiv);
    }
    
    // Show preview title if different from page title
    if (preview && preview.title && preview.title !== clipData.title) {
      const titleDiv = document.createElement('div');
      titleDiv.style.fontWeight = '500';
      titleDiv.style.marginBottom = '6px';
      titleDiv.textContent = preview.title;
      previewContent.insertBefore(titleDiv, previewContent.firstChild);
    }
    
    // Show thumbnail if available
    if (preview && preview.thumbnail_url) {
      const thumbnailImg = document.createElement('img');
      thumbnailImg.src = preview.thumbnail_url;
      thumbnailImg.className = 'preview-thumbnail';
      thumbnailImg.alt = 'Preview thumbnail';
      thumbnailImg.onerror = () => {
        previewThumbnail.removeChild(thumbnailImg);
      };
      previewThumbnail.appendChild(thumbnailImg);
    } else if (clipData.imageUrl) {
      const thumbnailImg = document.createElement('img');
      thumbnailImg.src = clipData.imageUrl;
      thumbnailImg.className = 'preview-thumbnail';
      thumbnailImg.alt = 'Page image';
      thumbnailImg.onerror = () => {
        previewThumbnail.removeChild(thumbnailImg);
      };
      previewThumbnail.appendChild(thumbnailImg);
    }
    
    // Show URL
    if (clipData.url) {
      const urlDiv = document.createElement('div');
      const urlText = preview?.site || extractDomainFromUrl(clipData.url);
      urlDiv.textContent = `Source: ${urlText}`;
      previewUrl.appendChild(urlDiv);
    }
    
    // Show metadata tags
    const metadata = [];
    
    if (clipData.mediaType) {
      metadata.push(clipData.mediaType.toUpperCase());
    }
    
    if (preview) {
      if (preview.type && preview.type !== 'link') {
        metadata.push(preview.type.toUpperCase());
      }
      
      if (preview.can_embed) {
        metadata.push('EMBEDDABLE');
      }
      
      if (preview.author) {
        metadata.push(`by ${preview.author}`);
      }
      
      if (preview.duration) {
        metadata.push(`${formatDuration(preview.duration)}`);
      }
      
      metadata.push(preview.source?.toUpperCase() || 'PREVIEW');
    }
    
    metadata.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'preview-tag';
      tagSpan.textContent = tag;
      previewMetadata.appendChild(tagSpan);
    });
    
    // Show the preview
    previewDiv.style.display = 'block';
  }
  
  // Extract domain from URL for display
  function extractDomainFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
      return url.substring(0, 50) + '...';
    }
  }
  
  // Format duration for display
  function formatDuration(seconds) {
    if (!seconds) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
  
  // Enhanced content formatting with preview data
  function formatContentForDisplay(clipData, preview) {
    let content = '';
    
    // Priority 1: Add selected text if available and meaningful
    if (clipData.content && clipData.content !== "No content selected" && clipData.content.trim()) {
      content += `${clipData.content}\n\n`;
    }
    
    // Priority 2: If no meaningful content, use preview description
    if (!content && preview && preview.description && preview.description.trim()) {
      content += `${preview.description}\n\n`;
    }
    
    // Priority 3: Add preview title if different from page title
    if (preview && preview.title && preview.title !== clipData.title && preview.title.trim()) {
      content += `${preview.title}\n\n`;
    }
    
    // Priority 4: Add page description if available
    if (!content && clipData.description && clipData.description.trim()) {
      content += `${clipData.description}\n\n`;
    }
    
    // Priority 5: Add source URL with enhanced preview info
    if (clipData.url) {
      content += `Source: ${clipData.url}\n\n`;
    }
    
    // Add media URLs for backend processing
    if (clipData.imageUrl) {
      content += `[Image: ${clipData.imageUrl}]\n\n`;
    }
    
    if (clipData.mediaUrl) {
      content += `[${clipData.mediaType || 'Media'}: ${clipData.mediaUrl}]\n\n`;
    }
    
    console.log('formatContentForDisplay result:', {
      originalContent: clipData.content,
      previewDescription: preview?.description?.substring(0, 100) + '...',
      previewTitle: preview?.title,
      finalContentLength: content.length,
      finalContentPreview: content.substring(0, 200) + '...'
    });
    
    return content.trim();
  }
  
  // Post to Circle using new clip API
  postButton.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const spaceId = spaceIdInput.value.trim();
    
    if (!title && !content) {
      showStatus('Please fill in title or content', 'error');
      return;
    }
    
    if (!window.sessionToken || !window.backendUrl) {
      showStatus('Not authenticated. Please re-authenticate in settings.', 'error');
      return;
    }
    
    // Disable button and show loading
    postButton.disabled = true;
    postButton.textContent = 'Posting...';
    showStatus('Processing content and posting to Circle...', 'info');
    
    // Save space ID for future use (ensure we always have a valid space ID)
    const spaceIdToSave = spaceId || DEFAULT_SPACE_ID;
    chrome.storage.sync.set({spaceId: spaceIdToSave});
    
    try {
      // Get current tab data for media URLs
      const tabData = await getCurrentTabData();
      
      // Prepare clip data for backend
      const selectedTextData = extractSelectedText(content);
      const clipData = {
        title,
        selectedText: selectedTextData,
        url: tabData.url,
        imageUrl: tabData.imageUrl,
        mediaUrl: tabData.mediaUrl,
        mediaType: tabData.mediaType,
        spaceId: spaceIdToSave
      };
      
      console.log('Sending clip data:', {
        title: clipData.title?.substring(0, 50) + (clipData.title?.length > 50 ? '...' : ''),
        selectedTextLength: clipData.selectedText?.length || 0,
        selectedTextPreview: clipData.selectedText?.substring(0, 100) + (clipData.selectedText?.length > 100 ? '...' : ''),
        hasUrl: !!clipData.url,
        hasImage: !!clipData.imageUrl,
        hasMedia: !!clipData.mediaUrl,
        spaceId: clipData.spaceId
      });
      
      // Send to clip endpoint
      const response = await fetch(`${window.backendUrl}/clip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.sessionToken}`
        },
        body: JSON.stringify(clipData)
      });
      
      // Re-enable button
      postButton.disabled = false;
      postButton.textContent = 'Post to Circle';
      
      if (!response.ok) {
        let errorMessage = 'Failed to post content';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          
          // Handle session expiry
          if (response.status === 401) {
            errorMessage = 'Session expired. Please re-authenticate in settings.';
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        showStatus(`✗ Error: ${errorMessage}`, 'error');
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        showStatus('✓ Posted successfully!', 'success');
        console.log('Post created:', result);
        
        // Clear form after successful post
        setTimeout(() => {
          titleInput.value = '';
          contentInput.value = '';
          previewDiv.style.display = 'none';
          showStatus('', '');
        }, 2000);
      } else {
        showStatus(`✗ Error: ${result.message || 'Unknown error'}`, 'error');
      }
      
    } catch (error) {
      // Re-enable button
      postButton.disabled = false;
      postButton.textContent = 'Post to Circle';
      
      console.error('Post error:', error);
      
      let errorMessage = 'Network error or server is unavailable';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Could not connect to backend server';
      } else if (error.message.includes('Session expired')) {
        errorMessage = 'Session expired. Please re-authenticate in settings.';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      showStatus(`✗ ${errorMessage}`, 'error');
    }
  });
  
  // Get current tab data
  async function getCurrentTabData() {
    return new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "getClipData"}, (response) => {
          resolve(response || {});
        });
      });
    });
  }
  
  // Extract selected text from formatted content
  function extractSelectedText(content) {
    if (!content || typeof content !== 'string') {
      console.warn('extractSelectedText: Invalid content', content);
      return '';
    }
    
    const originalContent = content;
    
    // Remove URLs and media indicators to get just the text content
    const lines = content.split('\n');
    const textLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && 
        !trimmed.startsWith('Source:') && 
        !trimmed.startsWith('[Image:') && 
        !trimmed.startsWith('[Video:') && 
        !trimmed.startsWith('[Audio:') && 
        !trimmed.startsWith('[Media:');
    });
    
    let result = textLines.join('\n').trim();
    
    // Failsafe: If filtering removed everything, try to extract just the first meaningful line
    if (!result && originalContent) {
      const firstMeaningfulLine = lines.find(line => {
        const trimmed = line.trim();
        return trimmed && 
          !trimmed.startsWith('Source:') && 
          !trimmed.startsWith('[') &&
          trimmed.length > 10; // At least some meaningful content
      });
      
      if (firstMeaningfulLine) {
        result = firstMeaningfulLine.trim();
      } else {
        // Last resort: use the original content minus obvious metadata
        const cleanedLines = lines.filter(line => {
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('[') && trimmed.length > 3;
        });
        if (cleanedLines.length > 0) {
          result = cleanedLines.slice(0, 3).join('\n').trim(); // Take first 3 meaningful lines
        }
      }
    }
    
    console.log('extractSelectedText result:', {
      originalLength: content.length,
      filteredLength: result.length,
      linesOriginal: lines.length,
      linesFiltered: textLines.length,
      hasFailsafe: result !== textLines.join('\n').trim(),
      preview: result.substring(0, 100) + (result.length > 100 ? '...' : '')
    });
    
    return result;
  }
  
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
  
  // Live preview update - simplified for new architecture
  contentInput.addEventListener('input', () => {
    // Just update the text content preview, keep other elements
    if (contentInput.value.trim()) {
      const textDiv = previewContent.querySelector('div') || document.createElement('div');
      textDiv.textContent = contentInput.value.substring(0, 200) + (contentInput.value.length > 200 ? '...' : '');
      
      if (!previewContent.querySelector('div')) {
        previewContent.appendChild(textDiv);
      }
      
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