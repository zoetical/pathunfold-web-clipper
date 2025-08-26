// Iframely integration for link preview and embed capabilities
const { cachePreviewResult, getCachedPreviewResult } = require('./cache');

const IFRAMELY_API_BASE = 'https://iframe.ly/api/iframely';
const IFRAMELY_OEMBED_BASE = 'https://iframe.ly/api/oembed';

async function getIframelyPreview(url) {
  // Check cache first
  const cached = getCachedPreviewResult(url);
  if (cached) {
    console.log('Cache hit for URL:', url);
    return cached;
  }

  const IFRAMELY_KEY = process.env.IFRAMELY_KEY;
  if (!IFRAMELY_KEY) {
    console.warn('IFRAMELY_KEY not configured, using fallback preview');
    return createFallbackPreview(url);
  }

  try {
    console.log('Fetching Iframely preview for:', url);
    
    const apiUrl = `${IFRAMELY_API_BASE}?url=${encodeURIComponent(url)}&api_key=${IFRAMELY_KEY}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'PathUnfold-Web-Clipper/1.0'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`Iframely API error: ${response.status} ${response.statusText}`);
      return createFallbackPreview(url);
    }

    const data = await response.json();
    console.log('Iframely response keys:', Object.keys(data));
    console.log('Iframely meta keys:', data.meta ? Object.keys(data.meta) : 'No meta');
    
    // Extract rich metadata from the proper structure
    const meta = data.meta || {};
    const links = data.links || {};
    
    const preview = {
      url,
      title: meta.title || data.title || extractTitleFromUrl(url),
      site: meta.site || data.site || extractDomainFromUrl(url),
      description: meta.description || data.description || '',
      thumbnail_url: findBestThumbnail(links),
      can_embed: canEmbedFromLinks(links),
      embed_html: findEmbedHtml(links),
      type: meta.medium || data.type || 'link',
      author: meta.author || data.author || null,
      duration: meta.duration || data.duration || null,
      views: meta.views || null,
      likes: meta.likes || null,
      cached_at: new Date().toISOString(),
      source: 'iframely'
    };

    // Cache for 24 hours
    cachePreviewResult(url, preview, 24 * 60 * 60);
    
    return preview;
    
  } catch (error) {
    console.error('Iframely API error:', error.message);
    return createFallbackPreview(url);
  }
}

function createFallbackPreview(url) {
  console.log('Creating fallback preview for:', url);
  
  return {
    url,
    title: extractTitleFromUrl(url),
    site: extractDomainFromUrl(url),
    description: '',
    thumbnail_url: null,
    can_embed: false,
    embed_html: null,
    type: 'link',
    author: null,
    duration: null,
    cached_at: new Date().toISOString(),
    source: 'fallback'
  };
}

function findBestThumbnail(links) {
  if (!links || typeof links !== 'object') return null;
  
  // Look for thumbnail in preferred order from link categories
  const thumbnailCategories = ['thumbnail', 'image', 'logo'];
  
  for (const category of thumbnailCategories) {
    if (links[category] && Array.isArray(links[category])) {
      // Find the highest resolution thumbnail
      const thumbnails = links[category].filter(link => link.href);
      if (thumbnails.length > 0) {
        // Sort by media dimensions if available, prefer larger thumbnails
        thumbnails.sort((a, b) => {
          const aArea = (a.media?.width || 0) * (a.media?.height || 0);
          const bArea = (b.media?.width || 0) * (b.media?.height || 0);
          return bArea - aArea; // Descending order
        });
        return thumbnails[0].href;
      }
    }
  }
  
  return null;
}

function canEmbedFromLinks(links) {
  if (!links || typeof links !== 'object') return false;
  
  // Check for embed capabilities in player, app, or reader categories
  const embedCategories = ['player', 'app', 'reader'];
  
  for (const category of embedCategories) {
    if (links[category] && Array.isArray(links[category]) && links[category].length > 0) {
      return true;
    }
  }
  
  return false;
}

function findEmbedHtml(links) {
  if (!links || typeof links !== 'object') return null;
  
  // Look for embed HTML in player category first
  if (links.player && Array.isArray(links.player)) {
    const playerWithHtml = links.player.find(link => link.html);
    if (playerWithHtml) {
      return playerWithHtml.html;
    }
  }
  
  // Check other embed categories
  const embedCategories = ['app', 'reader'];
  for (const category of embedCategories) {
    if (links[category] && Array.isArray(links[category])) {
      const linkWithHtml = links[category].find(link => link.html);
      if (linkWithHtml) {
        return linkWithHtml.html;
      }
    }
  }
  
  return null;
}

function extractTitleFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Remove leading slash and file extensions
    const title = pathname
      .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
      .replace(/\.[^.]*$/, '') // Remove file extension
      .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
      .replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      ); // Title case
    
    return title || urlObj.hostname;
  } catch (error) {
    return url;
  }
}

function extractDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    return 'Unknown Site';
  }
}

// YouTube-specific handling for better oEmbed
async function getYouTubeOEmbed(url) {
  try {
    const videoId = extractYouTubeId(url);
    if (!videoId) return null;
    
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title,
        author: data.author_name,
        thumbnail_url: data.thumbnail_url,
        embed_html: data.html,
        can_embed: true,
        type: 'video',
        site: 'YouTube'
      };
    }
  } catch (error) {
    console.warn('YouTube oEmbed error:', error.message);
  }
  
  return null;
}

function extractYouTubeId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

module.exports = {
  getIframelyPreview,
  getYouTubeOEmbed,
  extractYouTubeId,
  extractDomainFromUrl,
  extractTitleFromUrl
};