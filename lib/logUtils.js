// Utility functions for cleaner logging (reduce Railway log size)

/**
 * Truncate long strings like base64 images and URLs
 * @param {string} str - String to truncate
 * @param {number} maxLength - Max length before truncation
 * @returns {string} Truncated string
 */
export function truncateString(str, maxLength = 100) {
  if (!str || typeof str !== 'string') return str;
  if (str.length <= maxLength) return str;

  const half = Math.floor(maxLength / 2);
  return `${str.substring(0, half)}...${str.substring(str.length - half)}`;
}

/**
 * Truncate base64 data URIs to save log space
 * @param {string} dataUri - Data URI to truncate
 * @returns {string} Truncated data URI info
 */
export function truncateDataUri(dataUri) {
  if (!dataUri || typeof dataUri !== 'string') return dataUri;

  // Check if it's a data URI
  if (dataUri.startsWith('data:')) {
    const parts = dataUri.split(',');
    if (parts.length === 2) {
      const header = parts[0]; // e.g., "data:image/jpeg;base64"
      const data = parts[1];
      const sizeKB = Math.round((data.length * 0.75) / 1024);
      return `${header},[base64 data ~${sizeKB}KB]`;
    }
  }

  // Check if it's a long HTTP URL
  if (dataUri.startsWith('http')) {
    return truncateString(dataUri, 150);
  }

  return dataUri;
}

/**
 * Recursively truncate all data URIs and long strings in an object
 * @param {any} obj - Object to process
 * @param {number} maxDepth - Max recursion depth
 * @returns {any} Processed object with truncated data
 */
export function truncateDataInObject(obj, maxDepth = 5) {
  if (maxDepth <= 0) return obj;

  if (typeof obj === 'string') {
    return truncateDataUri(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => truncateDataInObject(item, maxDepth - 1));
  }

  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = truncateDataInObject(obj[key], maxDepth - 1);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Safe console.log that truncates long data URIs and URLs
 * @param {string} label - Log label
 * @param {any} data - Data to log
 */
export function safeLog(label, data) {
  const truncated = truncateDataInObject(data);
  console.log(label, truncated);
}

/**
 * Safe JSON stringify that truncates long data URIs
 * @param {any} obj - Object to stringify
 * @param {number} space - JSON indentation
 * @returns {string} JSON string with truncated data
 */
export function safeStringify(obj, space = 2) {
  const truncated = truncateDataInObject(obj);
  return JSON.stringify(truncated, null, space);
}
