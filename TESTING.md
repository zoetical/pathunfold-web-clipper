# PathUnfold Web Clipper v2 - Testing Guide

## Overview
This document outlines how to test the enhanced PathUnfold Web Clipper with the new "Iframely + Circle TipTap JSON" architecture.

## Environment Setup

### Required Environment Variables
```bash
# Required
CIRCLE_AUTH_TOKEN=your_circle_headless_auth_token

# Optional
IFRAMELY_KEY=your_iframely_api_key
JWT_SECRET=your_jwt_secret_key
```

### Development Setup
1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

## Testing Backend APIs

### 1. Authentication Endpoint
```bash
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email": "your-circle-email@example.com"}'
```

Expected response:
```json
{
  "session_token": "eyJ...",
  "expires_in": 86400,
  "message": "Authentication successful"
}
```

### 2. Preview Endpoint
```bash
curl -X GET "http://localhost:3000/api/preview?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "preview": {
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "site": "YouTube",
    "thumbnail_url": "https://...",
    "can_embed": true,
    "type": "video"
  }
}
```

### 3. Clip Endpoint
```bash
curl -X POST http://localhost:3000/api/clip \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "title": "Test Post",
    "selectedText": "This is a test clip",
    "url": "https://example.com",
    "spaceId": "2175665"
  }'
```

## Testing Extension Frontend

### 1. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the extension directory
4. The extension icon should appear in the toolbar

### 2. Authentication Flow
1. Click the extension icon
2. If not authenticated, click "click here to authenticate"
3. Enter your Circle email and backend URL
4. Click "Authenticate"
5. You should see "Authentication successful"

### 3. Content Clipping Flow
1. Navigate to any webpage (e.g., a YouTube video)
2. Click the extension icon
3. The popup should show:
   - Auto-filled title
   - Preview with thumbnail (if available)
   - Content text area
   - "Post to Circle" button
4. Click "Post to Circle"
5. You should see "Posted successfully!"

### 4. Context Menu
1. Right-click on any page
2. Select "Clip to Circle" from the context menu
3. The popup should open with content pre-filled

## Testing Features

### Enhanced Content Extraction
- **Text Selection**: Select text on a page, then use the clipper
- **Images**: Navigate to pages with images
- **Videos**: Test on YouTube, Vimeo, and other video platforms
- **Articles**: Test on news sites and blogs

### Preview Functionality  
- **Thumbnails**: Should show thumbnails from Iframely
- **Metadata**: Should show tags like "VIDEO", "EMBEDDABLE", etc.
- **Fallbacks**: Test with URLs that don't have rich previews

### Error Handling
- **Invalid URLs**: Try posting with malformed URLs
- **Network Errors**: Test with backend offline
- **Authentication Expiry**: Wait for tokens to expire
- **Rate Limiting**: Make many requests quickly

## Common Issues & Solutions

### 1. "Not authenticated" error
- Check that backend URL is correct
- Verify Circle auth token is set
- Check browser console for JWT errors

### 2. Preview not loading
- Verify Iframely key is set (optional)
- Check network tab for preview API calls
- Test with different URLs

### 3. Post creation fails
- Verify space ID is correct
- Check Circle token permissions
- Look at backend logs for detailed errors

### 4. Extension not loading
- Check manifest.json syntax
- Verify all files are present
- Look at Chrome extension console

## Architecture Validation

### Three-Tier Embedding Strategy
The system should handle URLs in this order:
1. **Tier 1**: True embed nodes (future enhancement)
2. **Tier 2**: Thumbnail + link (current implementation)
3. **Tier 3**: Plain link (fallback)

### TipTap JSON Generation
Check that posts in Circle show:
- Structured content with proper formatting
- Images rendered correctly
- Links preserved and clickable
- Media content embedded when possible

### Security Features
- JWT tokens expire after 24 hours
- Rate limiting prevents API abuse
- Sensitive data not logged
- CORS properly configured

## Performance Metrics

Monitor these during testing:
- Preview API response time (< 2s target)
- Post creation time (< 5s target)
- Memory usage in extension
- Cache hit rates for previews

## Deployment Checklist

Before deploying to production:
- [ ] All environment variables set
- [ ] Rate limits configured appropriately
- [ ] Error logging works
- [ ] CORS origins restricted if needed
- [ ] Extension manifest validated
- [ ] Icons and assets included
- [ ] Privacy policy updated if needed