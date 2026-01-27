/**
 * Privacy utilities for secure data handling and clearing
 */

/**
 * Securely clear sensitive data from memory
 * @param data - The data to clear
 */
export function secureClear(data: any): void {
  if (typeof data === 'object' && data !== null) {
    // Clear object properties
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'string') {
        // Overwrite string with random data before clearing
        data[key] = generateRandomString(data[key].length);
      }
      delete data[key];
    });
  }
}

/**
 * Generate random string for overwriting sensitive data
 * @param length - Length of the string to generate
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Clear sensitive data from localStorage with overwriting
 * @param key - The localStorage key to clear
 */
export function secureLocalStorageClear(key: string): void {
  const item = localStorage.getItem(key);
  if (item) {
    // Overwrite with random data first
    localStorage.setItem(key, generateRandomString(item.length));
    // Then remove
    localStorage.removeItem(key);
  }
}

/**
 * Validate that no personal information is exposed in contract outputs
 * @param contractOutput - The contract output to validate
 */
export function validateContractPrivacy(contractOutput: any): boolean {
  // Check that no age information is directly exposed
  const outputString = JSON.stringify(contractOutput).toLowerCase();
  
  // List of sensitive patterns that should not appear in outputs
  const sensitivePatterns = [
    /age.*\d{2}/,           // Age followed by numbers
    /birth.*\d{4}/,         // Birth year patterns
    /\d{4}.*birth/,         // Year patterns with birth
    /personal.*info/,       // Personal information
    /private.*data/,        // Private data references
  ];
  
  return !sensitivePatterns.some(pattern => pattern.test(outputString));
}

/**
 * Privacy-preserving error handler that doesn't leak sensitive information
 * @param error - The error to sanitize
 */
export function sanitizeError(error: Error): string {
  const message = error.message.toLowerCase();
  
  // Remove any potential age or birth year information from error messages
  const sanitized = message
    .replace(/\d{4}/g, 'XXXX')           // Replace years
    .replace(/age.*\d+/g, 'age verification')  // Replace age references
    .replace(/birth.*\d+/g, 'birth year verification'); // Replace birth year references
  
  return sanitized;
}

/**
 * Check if verification record contains only necessary information
 * @param record - The verification record to validate
 */
export function validateVerificationRecord(record: any): boolean {
  const allowedFields = ['owner', 'verified', '_nonce', '_version'];
  const recordFields = Object.keys(record);
  
  // Ensure only allowed fields are present
  const hasOnlyAllowedFields = recordFields.every(field => allowedFields.includes(field));
  
  // Ensure no sensitive data in field values
  // Exclude '_nonce' and 'owner' from validation as they contain timestamps/addresses
  const fieldsToCheck = recordFields.filter(f => !['_nonce', 'owner', '_version'].includes(f));
  
  const hasNoSensitiveData = fieldsToCheck.every(field => {
    const value = record[field];
    if (typeof value === 'string') {
      return !(/\d{4}/.test(value) || /age/i.test(value) || /birth/i.test(value));
    }
    return true;
  });
  
  return hasOnlyAllowedFields && hasNoSensitiveData;
}

/**
 * Privacy-aware console logging that filters sensitive information
 * @param message - The message to log
 * @param data - Optional data to log (will be sanitized)
 */
export function privacyLog(message: string, data?: any): void {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      const sanitizedData = JSON.parse(JSON.stringify(data));
      // Remove sensitive fields
      if (typeof sanitizedData === 'object') {
        delete sanitizedData.age;
        delete sanitizedData.birthYear;
        delete sanitizedData.personalInfo;
      }
      console.log(`[Privacy-Safe] ${message}`, sanitizedData);
    } else {
      console.log(`[Privacy-Safe] ${message}`);
    }
  }
}