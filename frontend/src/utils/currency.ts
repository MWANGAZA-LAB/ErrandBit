/**
 * Currency Conversion Utilities
 * Handles USD to cents conversion and vice versa
 */

/**
 * Convert USD dollars to cents
 * @param usd - Amount in USD dollars
 * @returns Amount in cents
 */
export const usdToCents = (usd: number): number => {
  return Math.round(usd * 100);
};

/**
 * Convert cents to USD dollars
 * @param cents - Amount in cents
 * @returns Amount in USD dollars
 */
export const centsToUsd = (cents: number): number => {
  return cents / 100;
};

/**
 * Format cents as USD string
 * @param cents - Amount in cents
 * @returns Formatted USD string (e.g., "$25.00")
 */
export const formatCentsAsUsd = (cents: number): string => {
  const usd = centsToUsd(cents);
  return `$${usd.toFixed(2)}`;
};

/**
 * Format USD as display string
 * @param usd - Amount in USD
 * @returns Formatted USD string (e.g., "$25.00")
 */
export const formatUsd = (usd: number): string => {
  return `$${usd.toFixed(2)}`;
};
