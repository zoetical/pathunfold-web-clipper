const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

// IMPORTANT: Set this environment variable with your Circle Headless Auth token
const CIRCLE_AUTH_TOKEN = process.env.CIRCLE_AUTH_TOKEN;

if (!CIRCLE_AUTH_TOKEN) {
  console.error('ERROR: CIRCLE_AUTH_TOKEN environment variable is not set');
  process.exit(1);
}

app.post('/auth', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const response = await fetch('https://app.circle.so/api/v1/headless/auth_token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CIRCLE_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (response.ok) {
      // Success - return the access token
      res.json({
        success: true,
        access_token: data.access_token,
        expires_in: data.expires_in || 3600 // Default 1 hour
      });
    } else {
      // Handle Circle API errors
      console.error('Circle API Error:', data);
      res.status(response.status).json({
        success: false,
        error: data.error || 'Failed to authenticate with Circle'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PathUnfold Auth Server running on port ${PORT}`);
  console.log('CIRCLE_AUTH_TOKEN:', CIRCLE_AUTH_TOKEN ? '✓ Set' : '✗ Not set');
});

module.exports = app;