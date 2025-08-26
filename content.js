// Enhanced content script for capturing web page content
// Implements improved content extraction with better media detection

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getClipData") {
    const clipData = extractPageContent();
    console.log('Extracted clip data:', {
      title: clipData.title?.substring(0, 50) + '...',
      hasContent: !!clipData.content,
      contentLength: clipData.content?.length || 0,
      hasImage: !!clipData.imageUrl,
      hasMedia: !!clipData.mediaUrl,
      mediaType: clipData.mediaType
    });
    
    sendResponse(clipData);
  }
  
  return true; // Keep the message channel open for async response
});

// Main content extraction function
function extractPageContent() {
  const selectedText = getSelectedText();
  const pageTitle = getPageTitle();
  const pageUrl = window.location.href;
  
  // Extract main content if no selection
  const mainContent = selectedText || extractMainContent();
  
  // Find images
  const imageUrl = findBestImage();
  
  // Find video/audio media
  const mediaInfo = findBestMedia();
  
  // Get page description
  const description = getPageDescription();
  
  return {
    title: pageTitle,
    content: mainContent || description || "No content selected",
    url: pageUrl,
    imageUrl: imageUrl,
    mediaUrl: mediaInfo.url,
    mediaType: mediaInfo.type,
    description: description
  };
}

// Get selected text with better formatting
function getSelectedText() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return '';
  
  let selectedText = selection.toString().trim();
  if (!selectedText) return '';
  
  // Clean up whitespace and normalize line breaks
  selectedText = selectedText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
  
  return selectedText;
}

// Get page title with fallbacks
function getPageTitle() {
  // Try different title sources in order of preference
  const titleSources = [
    () => document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    () => document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
    () => document.querySelector('h1')?.textContent,
    () => document.querySelector('.entry-title, .post-title, .article-title')?.textContent,
    () => document.title
  ];
  
  for (const getTitleFn of titleSources) {
    try {
      const title = getTitleFn()?.trim();
      if (title && title.length > 0) {
        return title.length > 200 ? title.substring(0, 200) + '...' : title;
      }
    } catch (error) {
      console.warn('Title extraction error:', error);
    }
  }
  
  return 'Web Page';
}

// Extract main content when no text is selected
function extractMainContent() {
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.story-body',
    '#content',
    '.main-content'
  ];
  
  for (const selector of contentSelectors) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        const textContent = extractTextFromElement(element);
        if (textContent && textContent.length > 50) {
          return textContent.length > 1000 ? textContent.substring(0, 1000) + '...' : textContent;
        }
      }
    } catch (error) {
      console.warn('Content extraction error for selector', selector, ':', error);
    }
  }
  
  return null;
}

// Extract clean text from an element
function extractTextFromElement(element) {
  // Clone the element to avoid modifying the original
  const clonedElement = element.cloneNode(true);
  
  // Remove script and style elements
  const unwantedElements = clonedElement.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ad, .social-share');
  unwantedElements.forEach(el => el.remove());
  
  // Get text content and clean it up
  let textContent = clonedElement.textContent || clonedElement.innerText || '';
  
  // Clean up whitespace and normalize
  textContent = textContent
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
  
  return textContent;
}

// Find the best image on the page
function findBestImage() {
  // First check for selected image
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const selectedElement = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE 
      ? range.commonAncestorContainer 
      : range.commonAncestorContainer.parentNode;
    
    const imgInSelection = selectedElement.querySelector?.('img') || 
                          (selectedElement.tagName === 'IMG' ? selectedElement : null);
    
    if (imgInSelection && imgInSelection.src && isValidImageUrl(imgInSelection.src)) {
      return imgInSelection.src;
    }
  }
  
  // Try different image sources in order of preference
  const imageSelectors = [
    { selector: 'meta[property="og:image"]', attr: 'content' },
    { selector: 'meta[name="twitter:image"]', attr: 'content' },
    { selector: 'link[rel="image_src"]', attr: 'href' },
    { selector: 'article img:first-of-type', attr: 'src' },
    { selector: '.content img:first-of-type', attr: 'src' },
    { selector: '.post-content img:first-of-type', attr: 'src' },
    { selector: '.entry-content img:first-of-type', attr: 'src' },
    { selector: 'main img:first-of-type', attr: 'src' },
    { selector: 'img[srcset]', attr: 'src' },
    { selector: 'img', attr: 'src' }
  ];
  
  for (const { selector, attr } of imageSelectors) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        const imageUrl = element.getAttribute(attr);
        if (imageUrl && isValidImageUrl(imageUrl)) {
          return makeAbsoluteUrl(imageUrl);
        }
      }
    } catch (error) {
      console.warn('Image extraction error for selector', selector, ':', error);
    }
  }
  
  return null;
}

// Find the best media (video/audio) on the page
function findBestMedia() {
  // Check for YouTube
  const youtubeInfo = extractYouTubeInfo();
  if (youtubeInfo) return youtubeInfo;
  
  // Check for Vimeo
  const vimeoInfo = extractVimeoInfo();
  if (vimeoInfo) return vimeoInfo;
  
  // Check for other video platforms
  const platformInfo = extractOtherPlatformInfo();
  if (platformInfo) return platformInfo;
  
  // Check for HTML5 video/audio elements
  const htmlMediaInfo = extractHtmlMediaInfo();
  if (htmlMediaInfo) return htmlMediaInfo;
  
  return { url: null, type: null };
}

// Extract YouTube video information
function extractYouTubeInfo() {
  const currentUrl = window.location.href;
  const youtubeId = extractYouTubeId(currentUrl);
  
  if (youtubeId) {
    return {
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
      type: 'video'
    };
  }
  
  // Check for embedded YouTube videos
  const youtubeEmbeds = [
    'iframe[src*="youtube.com/embed"]',
    'iframe[src*="youtu.be"]'
  ];
  
  for (const selector of youtubeEmbeds) {
    const embed = document.querySelector(selector);
    if (embed) {
      const embedUrl = embed.src;
      const embedId = extractYouTubeId(embedUrl);
      if (embedId) {
        return {
          url: `https://www.youtube.com/watch?v=${embedId}`,
          type: 'video'
        };
      }
    }
  }
  
  return null;
}

// Extract Vimeo video information  
function extractVimeoInfo() {
  const currentUrl = window.location.href;
  const vimeoMatch = currentUrl.match(/vimeo\.com\/(\d+)/);
  
  if (vimeoMatch) {
    return {
      url: `https://vimeo.com/${vimeoMatch[1]}`,
      type: 'video'
    };
  }
  
  // Check for embedded Vimeo videos
  const vimeoEmbed = document.querySelector('iframe[src*="vimeo.com/video"]');
  if (vimeoEmbed) {
    const embedUrl = vimeoEmbed.src;
    const embedMatch = embedUrl.match(/vimeo\.com\/video\/(\d+)/);
    if (embedMatch) {
      return {
        url: `https://vimeo.com/${embedMatch[1]}`,
        type: 'video'
      };
    }
  }
  
  return null;
}

// Extract other platform video information
function extractOtherPlatformInfo() {
  const platformSelectors = [
    { selector: 'iframe[src*="dailymotion.com"]', type: 'video' },
    { selector: 'iframe[src*="twitch.tv"]', type: 'video' },
    { selector: 'iframe[src*="soundcloud.com"]', type: 'audio' },
    { selector: 'iframe[src*="spotify.com"]', type: 'audio' }
  ];
  
  for (const { selector, type } of platformSelectors) {
    const element = document.querySelector(selector);
    if (element && element.src) {
      return {
        url: element.src,
        type: type
      };
    }
  }
  
  // Check meta tags for video URLs
  const videoMeta = document.querySelector('meta[property="og:video"]') ||
                   document.querySelector('meta[property="og:video:url"]');
  
  if (videoMeta) {
    return {
      url: videoMeta.getAttribute('content'),
      type: 'video'
    };
  }
  
  return null;
}

// Extract HTML5 video/audio information
function extractHtmlMediaInfo() {
  // Check for HTML5 video elements
  const videoElement = document.querySelector('video[src], video source');
  if (videoElement) {
    const videoSrc = videoElement.src || videoElement.querySelector('source')?.src;
    if (videoSrc && isValidMediaUrl(videoSrc)) {
      return {
        url: makeAbsoluteUrl(videoSrc),
        type: 'video'
      };
    }
  }
  
  // Check for HTML5 audio elements
  const audioElement = document.querySelector('audio[src], audio source');
  if (audioElement) {
    const audioSrc = audioElement.src || audioElement.querySelector('source')?.src;
    if (audioSrc && isValidMediaUrl(audioSrc)) {
      return {
        url: makeAbsoluteUrl(audioSrc),
        type: 'audio'
      };
    }
  }
  
  return null;
}

// Get page description
function getPageDescription() {
  const descSelectors = [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[name="twitter:description"]'
  ];
  
  for (const selector of descSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const desc = element.getAttribute('content')?.trim();
      if (desc && desc.length > 0) {
        return desc.length > 300 ? desc.substring(0, 300) + '...' : desc;
      }
    }
  }
  
  return '';
}

// Utility functions
function extractYouTubeId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function isValidImageUrl(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url, window.location.href);
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check file extension
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
    
    // Check for data URLs
    const isDataUrl = url.startsWith('data:image/');
    
    // Check for reasonable size constraints
    const hasReasonableSize = !url.includes('1x1') && !url.includes('pixel');
    
    return (hasImageExtension || isDataUrl) && hasReasonableSize;
  } catch (error) {
    return false;
  }
}

function isValidMediaUrl(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url, window.location.href);
    const pathname = urlObj.pathname.toLowerCase();
    
    const mediaExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mp3', '.wav', '.m4a'];
    return mediaExtensions.some(ext => pathname.endsWith(ext));
  } catch (error) {
    return false;
  }
}

function makeAbsoluteUrl(url) {
  if (!url) return null;
  
  try {
    return new URL(url, window.location.href).href;
  } catch (error) {
    return url;
  }
}