// Main clip endpoint implementing the three-tier embedding strategy
const { verifyJWT, extractJWTFromRequest } = require('../lib/jwt');
const { getMemberAccessToken, createPost } = require('../lib/circle');
const { getIframelyPreview } = require('../lib/iframely');
const { processRemoteMedia, processThumbnail } = require('../lib/media');
const { generatePostContent, validateTipTapDocument } = require('../lib/tiptap');

module.exports = async (req, res) => {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'CORS preflight successful' });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }
  
  try {
    console.log('=== CLIP REQUEST DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request body keys:', Object.keys(req.body));
    
    // Extract and verify JWT
    let userEmail;
    try {
      const token = extractJWTFromRequest(req);
      const payload = verifyJWT(token);
      userEmail = payload.sub;
      console.log('✓ JWT verified for user:', userEmail);
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid or expired session',
        message: 'Please re-authenticate',
        debug: jwtError.message
      });
    }
    
    const { 
      title, 
      url, 
      selectedText,
      imageUrl,
      mediaUrl,
      mediaType,
      spaceId 
    } = req.body;
    
    if (!title && !selectedText && !url) {
      return res.status(400).json({ 
        error: 'At least one of title, selectedText, or url is required',
        debug: 'Cannot create empty post'
      });
    }

    console.log('Processing clip for:', {
      title: title ? title.substring(0, 50) + '...' : null,
      url: url ? url.substring(0, 100) + '...' : null,
      hasSelectedText: !!selectedText,
      hasImageUrl: !!imageUrl,
      hasMediaUrl: !!mediaUrl,
      mediaType,
      spaceId,
      userEmail
    });

    // Get Circle access token for user
    let accessToken;
    try {
      accessToken = await getMemberAccessToken(userEmail);
      console.log('✓ Circle access token obtained');
    } catch (circleError) {
      return res.status(500).json({
        error: 'Failed to authenticate with Circle',
        message: 'Please try again or contact support',
        debug: circleError.message
      });
    }

    // Process content in parallel for better performance
    const processingPromises = {};

    // Get preview data if URL provided
    if (url) {
      console.log('Starting URL preview processing...');
      processingPromises.preview = getIframelyPreview(url);
    }

    // Process remote image if provided
    if (imageUrl) {
      console.log('Starting image processing...');
      processingPromises.imageUpload = processRemoteMedia(imageUrl, accessToken);
    }

    // Process remote media if provided
    if (mediaUrl) {
      console.log('Starting media processing...');
      processingPromises.mediaUpload = processRemoteMedia(mediaUrl, accessToken);
    }

    // Wait for all processing to complete
    const results = {};
    for (const [key, promise] of Object.entries(processingPromises)) {
      try {
        results[key] = await promise;
        console.log(`✓ ${key} processing completed`);
      } catch (error) {
        console.warn(`⚠ ${key} processing failed:`, error.message);
        results[key] = null;
      }
    }

    // Process thumbnail from preview for enhanced embedding (Tier 2 strategy)
    if (results.preview && results.preview.thumbnail_url && !results.imageUpload) {
      console.log('Processing thumbnail from preview...');
      try {
        const thumbnailUpload = await processThumbnail(results.preview.thumbnail_url, accessToken);
        if (thumbnailUpload) {
          results.preview.thumbnail_signed_id = thumbnailUpload.signed_id;
          console.log('✓ Thumbnail processed for enhanced preview');
        }
      } catch (thumbnailError) {
        console.warn('⚠ Thumbnail processing failed:', thumbnailError.message);
      }
    }

    // Prepare data for TipTap generation
    const contentData = {
      title,
      url,
      selectedText,
      preview: results.preview,
      imageSignedId: results.imageUpload?.signed_id,
      mediaSignedId: results.mediaUpload?.signed_id,
      mediaType: results.mediaUpload?.category || mediaType,
      mediaFilename: results.mediaUpload?.filename
    };

    console.log('Content data for TipTap generation:', {
      hasTitle: !!contentData.title,
      titlePreview: contentData.title?.substring(0, 50) + (contentData.title?.length > 50 ? '...' : ''),
      hasSelectedText: !!contentData.selectedText,
      selectedTextLength: contentData.selectedText?.length || 0,
      selectedTextPreview: contentData.selectedText?.substring(0, 100) + (contentData.selectedText?.length > 100 ? '...' : ''),
      hasUrl: !!contentData.url,
      hasPreview: !!contentData.preview,
      previewTitle: contentData.preview?.title?.substring(0, 50) + (contentData.preview?.title?.length > 50 ? '...' : ''),
      hasImageSignedId: !!contentData.imageSignedId,
      hasMediaSignedId: !!contentData.mediaSignedId
    });

    // Generate TipTap JSON content
    console.log('Generating TipTap JSON content...');
    const tiptapContent = generatePostContent(contentData);
    
    console.log('Generated TipTap structure:', {
      type: tiptapContent.type,
      contentNodesCount: tiptapContent.content?.length || 0,
      contentTypes: tiptapContent.content?.map(node => node.type) || [],
      hasContent: !!(tiptapContent.content && tiptapContent.content.length > 0)
    });
    
    // Validate TipTap document
    try {
      validateTipTapDocument(tiptapContent);
      console.log('✓ TipTap document validation passed');
    } catch (validationError) {
      console.error('TipTap validation failed:', validationError.message);
      return res.status(500).json({
        error: 'Content generation failed',
        message: 'Invalid content structure',
        debug: validationError.message
      });
    }

    // Prepare post data for Circle
    const postData = {
      name: title || (selectedText ? selectedText.substring(0, 100) : 'Web Clip'),
      tiptap_body: tiptapContent,
      post_type: 'basic'
    };

    // Add space_id if provided
    if (spaceId) {
      postData.space_id = spaceId;
    }

    console.log('Creating Circle post...');
    console.log('Post data structure:', {
      name: postData.name.substring(0, 50) + '...',
      hasContent: !!postData.tiptap_body,
      contentNodes: postData.tiptap_body.content?.length || 0,
      post_type: postData.post_type,
      space_id: postData.space_id
    });

    // Create post in Circle
    try {
      const postResult = await createPost(accessToken, postData);
      
      console.log('✓ Post created successfully');
      
      return res.status(200).json({
        success: true,
        message: 'Content clipped successfully',
        post: {
          id: postResult.post.id,
          url: postResult.post.url || postResult.post.share_url,
          title: postResult.post.name,
          space_id: postResult.post.space_id
        },
        processing: {
          preview_source: results.preview?.source,
          image_processed: !!results.imageUpload,
          media_processed: !!results.mediaUpload,
          thumbnail_enhanced: !!results.preview?.thumbnail_signed_id,
          endpoint_used: postResult.endpoint
        },
        meta: {
          user: userEmail,
          created_at: new Date().toISOString()
        }
      });

    } catch (postError) {
      console.error('Post creation failed:', postError.message);
      
      return res.status(500).json({
        error: 'Failed to create post',
        message: postError.message,
        debug: {
          user: userEmail,
          hasAccessToken: !!accessToken,
          postDataValid: !!postData.tiptap_body,
          spaceId: postData.space_id
        }
      });
    }

  } catch (error) {
    console.error('Clip processing error:', error);
    
    return res.status(500).json({
      error: 'Clip processing failed',
      message: error.message,
      debug: 'Check server logs for details'
    });
  }
};