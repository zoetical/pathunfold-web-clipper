// Enhanced background script for PathUnfold Web Clipper v2
// Now focuses on context menus and extension lifecycle management
// API communication moved to frontend with JWT authentication

console.log('PathUnfold Web Clipper v2 background script loaded');

// Global error handler
self.addEventListener('error', (event) => {
  console.error('Unhandled error in background script:', event.error);
});

// Global unhandled promise rejection handler
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in background script:', event.reason);
});

// Initialize extension
function initializeExtension() {
  console.log('=== Initializing Extension v2 ===');
  
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
      contexts: ['selection', 'image', 'video', 'audio', 'link', 'page']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Context menu creation failed:', chrome.runtime.lastError);
      } else {
        console.log('✓ Context menu created successfully');
      }
    });
  });
  
  console.log('Extension v2 initialization completed');
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  
  if (info.menuItemId === 'clipToCircle') {
    // Open popup to handle clipping
    chrome.action.openPopup();
  }
});

// Listen for messages from popup (simplified - most logic moved to frontend)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request.action, 'from', sender.tab ? 'tab' : 'popup');
  
  if (request.action === "ping") {
    sendResponse({ success: true, message: "Background script is alive" });
    return false;
  }
  
  // Handle unknown actions
  console.warn('Unknown action:', request.action);
  sendResponse({ success: false, message: "Unknown action: " + request.action });
  return false;
});

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('PathUnfold Web Clipper v2 installed');
  console.log('Install reason:', details.reason);
  
  // Initialize context menu
  initializeExtension();
  
  // Show welcome notification on fresh install
  if (details.reason === 'install') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/pathunfold logo 3.png',
      title: 'PathUnfold Web Clipper Installed',
      message: 'Click the extension icon to start clipping content to Circle!'
    });
  }
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

// Handle action click (extension icon)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.url);
  // Popup will open automatically due to manifest configuration
});