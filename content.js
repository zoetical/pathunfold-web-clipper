// Content script for capturing web page content
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getClipData") {
    const selectedText = window.getSelection().toString();
    const pageTitle = document.title;
    const pageUrl = window.location.href;

    // Find images in the selected content or on the page
    let imageUrl = '';
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedElement = range.commonAncestorContainer.parentNode;
      const imgInSelection = selectedElement.querySelector('img');
      if (imgInSelection) {
        imageUrl = imgInSelection.src;
      }
    }

    // If no image in selection, try to find the main image on the page
    if (!imageUrl) {
      // Try common image selectors
      const imageSelectors = [
        'meta[property="og:image"]',
        'img[srcset]',
        'article img:first-of-type',
        '.content img:first-of-type',
        '.post img:first-of-type',
        'img'
      ];
      
      for (const selector of imageSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          imageUrl = selector.startsWith('meta') ? element.getAttribute('content') : element.src;
          if (imageUrl) break;
        }
      }
    }

    // Find video/audio elements
    let mediaUrl = '';
    let mediaType = '';
    
    // Check for video elements
    const video = document.querySelector('video');
    if (video && video.src) {
      mediaUrl = video.src;
      mediaType = 'video';
    } else {
      // Check for common video embeds
      const videoEmbeds = [
        'iframe[src*="youtube.com"]',
        'iframe[src*="youtu.be"]',
        'iframe[src*="vimeo.com"]',
        'iframe[src*="dailymotion.com"]'
      ];
      
      for (const selector of videoEmbeds) {
        const element = document.querySelector(selector);
        if (element) {
          mediaUrl = element.src;
          mediaType = 'video';
          break;
        }
      }
    }

    // Check for audio elements
    if (!mediaUrl) {
      const audio = document.querySelector('audio');
      if (audio && audio.src) {
        mediaUrl = audio.src;
        mediaType = 'audio';
      }
    }

    // Get meta description for context
    let description = '';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      description = metaDesc.getAttribute('content');
    }

    sendResponse({
      title: pageTitle,
      content: selectedText || description || "No content selected",
      url: pageUrl,
      imageUrl,
      mediaUrl,
      mediaType
    });
  }
  
  return true; // Keep the message channel open for async response
});