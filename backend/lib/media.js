// Media processing utilities for direct upload and remote media handling
const { createDirectUpload, uploadToSignedUrl } = require('./circle');

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/avi', 'video/mov'];
const SUPPORTED_AUDIO_TYPES = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];

async function downloadRemoteMedia(url, maxSize = MAX_FILE_SIZE) {
  console.log('Downloading remote media:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PathUnfold-Web-Clipper/2.0'
      },
      timeout: 30000 // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSize) {
      throw new Error(`File too large: ${contentLength} bytes (max: ${maxSize})`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();
    
    if (buffer.byteLength > maxSize) {
      throw new Error(`File too large: ${buffer.byteLength} bytes (max: ${maxSize})`);
    }

    console.log('Successfully downloaded media:', {
      size: buffer.byteLength,
      contentType,
      url: url.substring(0, 100) + (url.length > 100 ? '...' : '')
    });

    return {
      buffer: Buffer.from(buffer),
      contentType,
      size: buffer.byteLength,
      filename: extractFilenameFromUrl(url, contentType)
    };

  } catch (error) {
    console.error('Failed to download remote media:', error.message);
    throw new Error(`Media download failed: ${error.message}`);
  }
}

async function uploadMediaToCircle(accessToken, mediaData) {
  console.log('Uploading media to Circle via Direct Upload');
  
  try {
    // Step 1: Create direct upload
    const uploadData = await createDirectUpload(
      accessToken,
      mediaData.filename,
      mediaData.contentType,
      mediaData.size
    );

    // Step 2: Upload to signed URL
    await uploadToSignedUrl(
      uploadData.direct_upload.url,
      mediaData.buffer,
      mediaData.contentType
    );

    console.log('Media uploaded successfully, signed_id:', uploadData.signed_id);
    
    return {
      signed_id: uploadData.signed_id,
      filename: mediaData.filename,
      contentType: mediaData.contentType,
      size: mediaData.size
    };

  } catch (error) {
    console.error('Media upload to Circle failed:', error.message);
    throw error;
  }
}

function extractFilenameFromUrl(url, contentType) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Try to extract filename from URL path
    const segments = pathname.split('/');
    let filename = segments[segments.length - 1];
    
    // If no filename or no extension, generate one
    if (!filename || !filename.includes('.')) {
      const extension = getExtensionFromContentType(contentType);
      const timestamp = Date.now();
      filename = `media_${timestamp}${extension}`;
    }
    
    // Sanitize filename
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
    
    return filename || 'media';
    
  } catch (error) {
    const extension = getExtensionFromContentType(contentType);
    return `media_${Date.now()}${extension}`;
  }
}

function getExtensionFromContentType(contentType) {
  const typeMap = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/avi': '.avi',
    'video/mov': '.mov',
    'audio/mp3': '.mp3',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/m4a': '.m4a'
  };
  
  return typeMap[contentType] || '.bin';
}

function isValidMediaType(contentType) {
  return SUPPORTED_IMAGE_TYPES.includes(contentType) ||
         SUPPORTED_VIDEO_TYPES.includes(contentType) ||
         SUPPORTED_AUDIO_TYPES.includes(contentType);
}

function getMediaCategory(contentType) {
  if (SUPPORTED_IMAGE_TYPES.includes(contentType)) {
    return 'image';
  }
  if (SUPPORTED_VIDEO_TYPES.includes(contentType)) {
    return 'video';
  }
  if (SUPPORTED_AUDIO_TYPES.includes(contentType)) {
    return 'audio';
  }
  return 'file';
}

async function processRemoteMedia(url, accessToken) {
  console.log('Processing remote media:', url);
  
  try {
    // Download the media
    const mediaData = await downloadRemoteMedia(url);
    
    // Check if it's a valid media type
    if (!isValidMediaType(mediaData.contentType)) {
      console.warn('Unsupported media type:', mediaData.contentType);
      return null;
    }
    
    // Upload to Circle
    const uploadResult = await uploadMediaToCircle(accessToken, mediaData);
    
    return {
      ...uploadResult,
      category: getMediaCategory(mediaData.contentType),
      originalUrl: url
    };
    
  } catch (error) {
    console.error('Remote media processing failed:', error.message);
    return null; // Return null instead of throwing to allow fallback to URL embedding
  }
}

// Process thumbnail for preview enhancement (Tier 2 strategy)
async function processThumbnail(thumbnailUrl, accessToken) {
  console.log('Processing thumbnail for preview enhancement:', thumbnailUrl);
  
  try {
    // Download thumbnail with smaller size limit
    const thumbnailData = await downloadRemoteMedia(thumbnailUrl, 5 * 1024 * 1024); // 5MB limit for thumbnails
    
    if (!SUPPORTED_IMAGE_TYPES.includes(thumbnailData.contentType)) {
      console.warn('Thumbnail is not a supported image type:', thumbnailData.contentType);
      return null;
    }
    
    // Upload thumbnail to Circle
    const uploadResult = await uploadMediaToCircle(accessToken, thumbnailData);
    
    return uploadResult;
    
  } catch (error) {
    console.error('Thumbnail processing failed:', error.message);
    return null;
  }
}

// Remove EXIF data from images for privacy
function stripImageMetadata(buffer, contentType) {
  // For now, just return the buffer as-is
  // In production, you might want to use a library like 'exif-remover' or 'sharp'
  console.log('EXIF stripping not implemented yet');
  return buffer;
}

module.exports = {
  downloadRemoteMedia,
  uploadMediaToCircle,
  processRemoteMedia,
  processThumbnail,
  extractFilenameFromUrl,
  getExtensionFromContentType,
  isValidMediaType,
  getMediaCategory,
  stripImageMetadata,
  MAX_FILE_SIZE,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_AUDIO_TYPES
};