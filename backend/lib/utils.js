// Global error handler and utility functions for the backend
const { createJWT } = require('./jwt');

// Global error types
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

class RateLimitError extends Error {
  constructor(message, retryAfter = 60) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
    this.retryAfter = retryAfter;
  }
}

// Error response formatter
function formatErrorResponse(error, includeStack = false) {
  const response = {
    error: error.name || 'UnknownError',
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  };
  
  // Add specific error fields
  if (error.field) {
    response.field = error.field;
  }
  
  if (error.retryAfter) {
    response.retry_after = error.retryAfter;
  }
  
  if (error.statusCode) {
    response.status_code = error.statusCode;
  }
  
  // Add stack trace in development
  if (includeStack && error.stack) {
    response.stack = error.stack;
  }
  
  return response;
}

// Universal error handler for Vercel API routes
function handleApiError(error, res) {
  console.error('API Error:', {
    name: error.name,
    message: error.message,
    stack: error.stack?.split('\n').slice(0, 5).join('\n') // Truncated stack
  });
  
  const statusCode = error.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const errorResponse = formatErrorResponse(error, isDevelopment);
  
  // Add rate limiting headers
  if (error.name === 'RateLimitError') {
    res.setHeader('Retry-After', error.retryAfter);
    res.setHeader('X-RateLimit-Limit', '100');
    res.setHeader('X-RateLimit-Remaining', '0');
  }
  
  return res.status(statusCode).json(errorResponse);
}

// Request validation utilities
function validateEmail(email) {
  if (!email) {
    throw new ValidationError('Email is required', 'email');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email');
  }
  
  return email.toLowerCase().trim();
}

function validateUrl(url, fieldName = 'url') {
  if (!url) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new ValidationError(`${fieldName} must use HTTP or HTTPS protocol`, fieldName);
    }
    
    return urlObj.href;
  } catch (error) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }
}

function validateString(value, fieldName, minLength = 1, maxLength = 10000) {
  if (!value) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  
  const trimmed = value.trim();
  
  if (trimmed.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`, fieldName);
  }
  
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} must be no more than ${maxLength} characters`, fieldName);
  }
  
  return trimmed;
}

// Simple rate limiting (in-memory)
const rateLimitStore = new Map();

function checkRateLimit(identifier, maxRequests = 100, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Get or create rate limit data
  let requestData = rateLimitStore.get(identifier) || { requests: [], created: now };
  
  // Remove old requests outside the window
  requestData.requests = requestData.requests.filter(time => time > windowStart);
  
  // Check if limit exceeded
  if (requestData.requests.length >= maxRequests) {
    const oldestRequest = Math.min(...requestData.requests);
    const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
    
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter
    );
  }
  
  // Add current request
  requestData.requests.push(now);
  rateLimitStore.set(identifier, requestData);
  
  // Cleanup old entries periodically
  if (Math.random() < 0.01) { // 1% chance
    cleanupRateLimit(windowStart);
  }
  
  return true;
}

function cleanupRateLimit(cutoff) {
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.created < cutoff && data.requests.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

// Request logging
function logRequest(req, startTime) {
  const duration = Date.now() - startTime;
  const method = req.method;
  const url = req.url;
  const userAgent = req.headers['user-agent'];
  
  console.log(`${method} ${url} - ${duration}ms - ${userAgent?.substring(0, 50)}`);
}

// Security utilities
function sanitizeHeaders(headers) {
  const sanitized = {};
  const allowedHeaders = [
    'authorization',
    'content-type',
    'accept',
    'user-agent',
    'origin',
    'referer'
  ];
  
  for (const [key, value] of Object.entries(headers)) {
    if (allowedHeaders.includes(key.toLowerCase())) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Environment validation
function validateEnvironment() {
  const required = ['CIRCLE_AUTH_TOKEN'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Warn about optional variables
  const optional = ['IFRAMELY_KEY', 'JWT_SECRET'];
  const missingOptional = optional.filter(key => !process.env[key]);
  
  if (missingOptional.length > 0) {
    console.warn('Missing optional environment variables:', missingOptional.join(', '));
  }
}

module.exports = {
  // Error classes
  ValidationError,
  AuthenticationError,
  RateLimitError,
  
  // Error handling
  formatErrorResponse,
  handleApiError,
  
  // Validation
  validateEmail,
  validateUrl,
  validateString,
  
  // Rate limiting
  checkRateLimit,
  
  // Utilities
  logRequest,
  sanitizeHeaders,
  validateEnvironment
};