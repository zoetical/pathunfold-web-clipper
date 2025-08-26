// Simple in-memory cache with TTL support
// For production, consider using Redis or similar persistent cache

class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttlSeconds = 3600) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, {
      value,
      expiresAt
    });
    
    // Clean up expired entries
    this.cleanup();
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  size() {
    this.cleanup();
    return this.cache.size;
  }
}

// Global cache instance
const cache = new MemoryCache();

// Cache key helpers
function generateCacheKey(type, ...parts) {
  return `${type}:${parts.join(':')}`;
}

// Specific cache functions
function cachePreviewResult(url, result, ttl = 24 * 60 * 60) { // 24 hours default
  const key = generateCacheKey('preview', url);
  cache.set(key, result, ttl);
}

function getCachedPreviewResult(url) {
  const key = generateCacheKey('preview', url);
  return cache.get(key);
}

function cacheCircleToken(email, token, ttl = 50 * 60) { // 50 minutes default (Circle tokens expire in 1 hour)
  const key = generateCacheKey('token', email);
  cache.set(key, token, ttl);
}

function getCachedCircleToken(email) {
  const key = generateCacheKey('token', email);
  return cache.get(key);
}

module.exports = {
  cache,
  generateCacheKey,
  cachePreviewResult,
  getCachedPreviewResult,
  cacheCircleToken,
  getCachedCircleToken
};