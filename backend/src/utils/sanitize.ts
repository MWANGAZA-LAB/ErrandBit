/**
 * Input Sanitization Utilities
 * Provides functions to clean and sanitize user input
 */

/**
 * Sanitize text input by removing control characters and normalizing whitespace
 * @param input - The text to sanitize
 * @param maxLength - Maximum allowed length (default: 10000)
 * @returns Sanitized text
 */
export function sanitizeText(input: string, maxLength: number = 10000): string {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters including null bytes
    .replace(/\s+/g, ' ') // Normalize whitespace (collapse multiple spaces)
    .substring(0, maxLength); // Enforce max length
}

/**
 * Sanitize HTML by escaping special characters
 * Prevents XSS attacks when rendering user-generated content
 * @param input - The text to escape
 * @returns HTML-safe text
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize and validate a numeric string
 * @param input - The numeric string to sanitize
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Sanitized number or null if invalid
 */
export function sanitizeNumber(
  input: string | number,
  min?: number,
  max?: number
): number | null {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  
  if (min !== undefined && num < min) {
    return null;
  }
  
  if (max !== undefined && num > max) {
    return null;
  }
  
  return num;
}

/**
 * Sanitize email address
 * @param email - The email to sanitize
 * @returns Sanitized email in lowercase or null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  const sanitized = email.trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized) || sanitized.length > 254) {
    return null;
  }
  
  return sanitized;
}

/**
 * Sanitize URL
 * @param url - The URL to sanitize
 * @param allowedProtocols - Allowed URL protocols (default: http, https)
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ['http', 'https']
): string | null {
  const sanitized = url.trim();
  
  try {
    const parsed = new URL(sanitized);
    
    if (!allowedProtocols.includes(parsed.protocol.replace(':', ''))) {
      return null;
    }
    
    return sanitized;
  } catch {
    return null;
  }
}
