/**
 * Safe Object and Array Access Utilities
 * Prevents Prototype Pollution and Out-of-Bounds array indexing
 */

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
 * Safely looks up a value in an object to prevent prototype pollution 
 * or unsafe access to internal properties.
 * 
 * @param {Object} object - The object to lookup against.
 * @param {string} key - The dynamic key.
 * @param {any} fallback - A fallback value if the key doesn't exist.
 * @returns {any}
 */
export const safeObjectAccess = (object, key, fallback = undefined) => {
  if (!object || !key || isForbiddenKey(key)) {
    return fallback;
  }
  return Object.prototype.hasOwnProperty.call(object, key) ? object[key] : fallback;
};

/**
 * Safely accesses an array element with strict integer bounds checking.
 * 
 * @param {Array} array - The target array.
 * @param {number} index - The requested index.
 * @param {any} fallback - Fallback value if out of bounds.
 * @returns {any}
 */
export const safeArrayAccess = (array, index, fallback = undefined) => {
  if (!Array.isArray(array)) return fallback;
  
  const safeIndex = Number.isInteger(index) && index >= 0 && index < array.length ? index : -1;
  return safeIndex !== -1 ? array[safeIndex] : fallback;
};
