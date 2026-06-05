/**
 * Safe Navigation Utilities
 * Prevents Unsafe Route Execution and Open Redirects
 */

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
