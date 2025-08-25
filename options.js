// Options page script for PathUnfold Web Clipper
document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const backendUrlInput = document.getElementById('backendUrl');
  const authenticateButton = document.getElementById('authenticateButton');
  const statusDiv = document.getElementById('status');
  const clearButton = document.getElementById('clearButton');
  
  // Display current settings
  function displayCurrentSettings() {
    chrome.storage.sync.get(['email', 'backendUrl', 'accessToken'], (data) => {
      document.getElementById('currentEmail').textContent = data.email || 'Not set';
      document.getElementById('currentBackend').textContent = data.backendUrl || 'Not configured';
      
      if (data.accessToken) {
        document.getElementById('authStatus').textContent = '✓ Authenticated';
        document.getElementById('authStatus').style.color = '#28a745';
      } else {
        document.getElementById('authStatus').textContent = 'Not authenticated';
        document.getElementById('authStatus').style.color = '#dc3545';
      }
      
      // Populate form fields
      if (data.email) emailInput.value = data.email;
      if (data.backendUrl) backendUrlInput.value = data.backendUrl;
    });
  }
  
  // Load current settings on page load
  displayCurrentSettings();
  
  // Authenticate button click handler
  authenticateButton.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const backendUrl = backendUrlInput.value.trim() || '';
    
    if (!email) {
      showStatus('Please enter a valid email address', 'error');
      return;
    }
    
    if (!backendUrl) {
      showStatus('Please enter your backend URL (e.g., https://your-project.vercel.app/api/auth)', 'error');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showStatus('Please enter a valid email address', 'error');
      return;
    }
    
    // Validate URL format
    try {
      new URL(backendUrl);
    } catch (e) {
      showStatus('Please enter a valid backend URL (must start with http:// or https://)', 'error');
      return;
    }
    
    // Disable button and show loading
    authenticateButton.disabled = true;
    authenticateButton.textContent = 'Authenticating...';
    showStatus('Connecting to backend...', 'info');
    
    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse.substring(0, 200));
        throw new Error('Backend returned HTML instead of JSON. Please check your backend URL.');
      }
      
      const data = await response.json();
      
      if (response.ok && data.access_token) {
        // Save authentication data
        chrome.storage.sync.set({
          email: email,
          backendUrl: backendUrl,
          accessToken: data.access_token,
          tokenTimestamp: Date.now()
        }, () => {
          showStatus('✓ Authentication successful!', 'success');
          displayCurrentSettings();
          
          // Re-enable button
          authenticateButton.disabled = false;
          authenticateButton.textContent = 'Authenticate';
        });
      } else {
        throw new Error(data.error || 'Failed to authenticate');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      
      let errorMessage = 'Authentication failed';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Could not connect to backend server. Please check your backend URL.';
      } else if (error.message.includes('HTML instead of JSON')) {
        errorMessage = 'Invalid backend URL: Server returned a webpage instead of API response.';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Invalid email address';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      showStatus(errorMessage, 'error');
      
      // Re-enable button
      authenticateButton.disabled = false;
      authenticateButton.textContent = 'Authenticate';
    }
  });
  
  // Clear settings button
  clearButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all settings?')) {
      chrome.storage.sync.clear(() => {
        showStatus('Settings cleared successfully', 'success');
        emailInput.value = '';
        backendUrlInput.value = '';
        displayCurrentSettings();
      });
    }
  });
  
  // Show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type ? type : '';
    statusDiv.style.display = message ? 'block' : 'none';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  }
  
  // Check for token expiration
  function checkTokenExpiration() {
    chrome.storage.sync.get(['tokenTimestamp'], (data) => {
      if (data.tokenTimestamp) {
        const tokenAge = Date.now() - data.tokenTimestamp;
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        
        if (tokenAge > oneHour) {
          showStatus('⚠️ Your access token has expired. Please re-authenticate.', 'error');
        }
      }
    });
  }
  
  // Check token expiration on load
  checkTokenExpiration();
  
  // Save backend URL when changed
  backendUrlInput.addEventListener('change', () => {
    chrome.storage.sync.set({ backendUrl: backendUrlInput.value });
  });
});