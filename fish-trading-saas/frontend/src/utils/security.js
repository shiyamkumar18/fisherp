/**
 * Security Utilities for mitigating Prototype Pollution, Code Injection, and Unsafe Dynamic Property Access
 */

/**
 * Safely looks up a value in a dictionary/map to prevent prototype pollution 
 * or unsafe access to internal properties like __proto__, constructor, etc.
 * 
 * @param {Object} map - The dictionary object to lookup against.
 * @param {string} key - The dynamic key.
 * @param {any} defaultValue - A fallback value if the key doesn't exist.
 * @returns {any}
 */
export const safeMapLookup = (map, key, defaultValue = undefined) => {
  if (!map || typeof key !== 'string') return defaultValue;
  if (Object.prototype.hasOwnProperty.call(map, key)) {
    return map[key];
  }
  return defaultValue;
};

/**
 * Validates whether a dynamic key is a forbidden prototype property.
 * 
 * @param {string} key - The dynamic key to check.
 * @returns {boolean} True if the key is forbidden.
 */
export const isForbiddenKey = (key) => {
  const forbidden = ['__proto__', 'constructor', 'prototype'];
  return forbidden.includes(key);
};

/**
 * Sanitizes a URL for safe navigation.
 * Only allows absolute internal relative paths (starting with '/') or whitelisted external protocols.
 * Rejects 'javascript:', 'data:', 'vbscript:' and 'file:' to prevent XSS.
 * 
 * @param {string} url - The URL to sanitize.
 * @param {string} fallbackUrl - The fallback URL if invalid.
 * @returns {string} The sanitized URL.
 */
export const sanitizeNavigationUrl = (url, fallbackUrl = '/dashboard') => {
  if (typeof url !== 'string' || !url.trim()) return fallbackUrl;
  
  const trimmedUrl = url.trim();

  // Allow relative paths starting with /
  if (trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('//')) {
    return trimmedUrl;
  }

  // Reject anything that looks like a malicious protocol
  const lowercaseUrl = trimmedUrl.toLowerCase();
  if (
    lowercaseUrl.startsWith('javascript:') ||
    lowercaseUrl.startsWith('data:') ||
    lowercaseUrl.startsWith('vbscript:') ||
    lowercaseUrl.startsWith('file:')
  ) {
    return fallbackUrl;
  }

  return fallbackUrl; // Strict mode: unless explicitly allowed above, reject.
};
