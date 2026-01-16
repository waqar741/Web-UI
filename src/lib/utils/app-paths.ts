/**
 * Application path constants
 */

// Use the VITE_API_BASE_URL environment variable if set, otherwise fallback to empty string (relative path)
export const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
