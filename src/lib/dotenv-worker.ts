/**
 * Simplified dotenv implementation for Cloudflare Workers
 * This avoids the need for Node.js built-in modules like fs, path, os, and crypto
 */

/**
 * Parse a .env file content into an object
 * @param content .env file content
 * @returns Object with environment variables
 */
export function parse(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  // Split content by newlines
  const lines = content.split(/\r?\n/);
  
  for (const line of lines) {
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) {
      continue;
    }
    
    // Match key=value pattern
    const match = line.match(/^\s*([^=:#]+?)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Load environment variables from a string
 * @param content .env file content
 */
export function config(content: string): void {
  const parsed = parse(content);
  
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} 