// Circle API integration for headless authentication and member operations
const { cacheCircleToken, getCachedCircleToken } = require('./cache');

const CIRCLE_API_BASE = 'https://app.circle.so/api';
const HEADLESS_API_BASE = `${CIRCLE_API_BASE}/headless/v1`;
const MEMBER_API_BASE = `${CIRCLE_API_BASE}/v1`;

class CircleAPIError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'CircleAPIError';
    this.status = status;
    this.response = response;
  }
}

async function getMemberAccessToken(email) {
  // Check cache first
  const cached = getCachedCircleToken(email);
  if (cached) {
    console.log('Using cached Circle token for:', email);
    return cached;
  }

  const CIRCLE_AUTH_TOKEN = process.env.CIRCLE_AUTH_TOKEN;
  if (!CIRCLE_AUTH_TOKEN) {
    throw new Error('CIRCLE_AUTH_TOKEN environment variable is not configured');
  }

  console.log('Requesting new Circle access token for:', email);

  try {
    const response = await fetch(`${CIRCLE_API_BASE}/v1/headless/auth_token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CIRCLE_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PathUnfold-Web-Clipper/2.0'
      },
      body: JSON.stringify({ email })
    });

    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new CircleAPIError(
        'Circle API returned non-JSON response',
        response.status,
        text.substring(0, 500)
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new CircleAPIError(
        data.error || 'Failed to get Circle access token',
        response.status,
        data
      );
    }

    if (!data.access_token) {
      throw new CircleAPIError('No access_token in Circle API response', response.status, data);
    }

    // Cache for 50 minutes (tokens expire in 1 hour)
    cacheCircleToken(email, data.access_token, 50 * 60);

    console.log('Successfully obtained Circle access token for:', email);
    return data.access_token;
    
  } catch (error) {
    if (error instanceof CircleAPIError) {
      throw error;
    }
    throw new CircleAPIError(`Circle API request failed: ${error.message}`, 0, null);
  }
}

async function createDirectUpload(accessToken, filename, contentType, size) {
  console.log('Creating direct upload for:', { filename, contentType, size });
  
  try {
    const response = await fetch(`${HEADLESS_API_BASE}/direct_uploads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PathUnfold-Web-Clipper/2.0'
      },
      body: JSON.stringify({
        blob: {
          filename,
          content_type: contentType,
          byte_size: size
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new CircleAPIError(
        `Direct upload creation failed: ${errorData.error || response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    
    if (!data.direct_upload || !data.signed_id) {
      throw new CircleAPIError('Invalid direct upload response format', response.status, data);
    }

    console.log('Direct upload created successfully, signed_id:', data.signed_id);
    return data;
    
  } catch (error) {
    if (error instanceof CircleAPIError) {
      throw error;
    }
    throw new CircleAPIError(`Direct upload request failed: ${error.message}`, 0, null);
  }
}

async function uploadToSignedUrl(signedUrl, buffer, contentType) {
  console.log('Uploading to signed URL, size:', buffer.length, 'bytes');
  
  try {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType
      },
      body: buffer
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload to signed URL failed: ${response.status} ${errorText}`);
    }

    console.log('Successfully uploaded to signed URL');
    return true;
    
  } catch (error) {
    throw new Error(`Upload to signed URL failed: ${error.message}`);
  }
}

async function createPost(accessToken, postData) {
  console.log('Creating Circle post with data keys:', Object.keys(postData));
  
  try {
    // Try different endpoints in order of preference
    const endpoints = [
      `${HEADLESS_API_BASE}/posts`,
      postData.space_id ? `${HEADLESS_API_BASE}/spaces/${postData.space_id}/posts` : null
    ].filter(Boolean);

    let lastError;
    
    for (const endpoint of endpoints) {
      try {
        console.log('Attempting to create post at:', endpoint);

        // Circle APIs sometimes require nested payloads. Try variants.
        const doc = postData.tiptap_body;
        const name = postData.name;
        const post_type = postData.post_type;
        const space_id = postData.space_id;
        const base = { name, post_type, space_id };
        const payloadVariants = [
          // 1) Flat payload (original)
          postData,
          // 2) Nested under post
          { post: { ...postData } },
          // 3) Aliases for TipTap body
          { ...base, tiptap_body: doc, rich_text_body: doc },
          { post: { ...base, tiptap_body: doc, rich_text_body: doc } },
          // 4) body/body_json aliases
          { ...base, body: doc },
          { post: { ...base, body: doc } },
          { ...base, body_json: doc },
          { post: { ...base, body_json: doc } },
          // 5) Stringified variants (some APIs accept JSON strings)
          { ...base, tiptap_body: JSON.stringify(doc) },
          { post: { ...base, tiptap_body: JSON.stringify(doc) } },
          { ...base, rich_text_body: JSON.stringify(doc) },
          { post: { ...base, rich_text_body: JSON.stringify(doc) } },
          { ...base, body: JSON.stringify(doc) },
          { post: { ...base, body: JSON.stringify(doc) } },
          { ...base, body_json: JSON.stringify(doc) },
          { post: { ...base, body_json: JSON.stringify(doc) } }
        ];

        for (let i = 0; i < payloadVariants.length; i++) {
          const variant = payloadVariants[i];
          const variantInfo = Array.isArray(variant)
            ? 'array'
            : Object.keys(variant).join(',');
          console.log(`Posting with payload variant ${i + 1}:`, variantInfo);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'User-Agent': 'PathUnfold-Web-Clipper/2.0'
            },
            body: JSON.stringify(variant)
          });

          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.warn(`Non-JSON response from ${endpoint} (variant ${i + 1}):`, text.substring(0, 200));
            // Try next variant
            continue;
          }

          const data = await response.json();
          if (response.ok) {
            console.log(`Post created successfully at: ${endpoint} using variant ${i + 1}`);
            return {
              success: true,
              post: data,
              endpoint
            };
          } else {
            console.warn(`Post creation failed at ${endpoint} (variant ${i + 1}):`, data);
            lastError = new CircleAPIError(
              data.error || `Post creation failed at ${endpoint} (variant ${i + 1})`,
              response.status,
              data
            );
            // Try next variant on same endpoint
          }
        }
        // If all variants failed for this endpoint, continue to next endpoint
      } catch (endpointError) {
        console.warn(`Endpoint ${endpoint} error:`, endpointError.message);
        lastError = endpointError;
      }
    }
    
    // If we get here, all endpoints failed
    throw lastError || new Error('All post creation endpoints failed');
    
  } catch (error) {
    if (error instanceof CircleAPIError) {
      throw error;
    }
    throw new CircleAPIError(`Post creation failed: ${error.message}`, 0, null);
  }
}

async function getSpaces(accessToken) {
  console.log('Fetching available spaces');
  
  try {
    const response = await fetch(`${HEADLESS_API_BASE}/spaces`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'PathUnfold-Web-Clipper/2.0'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new CircleAPIError(
        `Failed to fetch spaces: ${errorData.error || response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log('Successfully fetched spaces:', data.spaces?.length || 0);
    
    return data.spaces || [];
    
  } catch (error) {
    if (error instanceof CircleAPIError) {
      throw error;
    }
    throw new CircleAPIError(`Spaces request failed: ${error.message}`, 0, null);
  }
}

module.exports = {
  CircleAPIError,
  getMemberAccessToken,
  createDirectUpload,
  uploadToSignedUrl,
  createPost,
  getSpaces
};
