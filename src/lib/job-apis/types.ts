/**
 * Common types for job API integrations
 */

/**
 * Raw job data structure returned from various job board APIs
 */
export interface RawJobData {
  externalId: string;
  title: string;
  description: string;
  location?: string;
  department?: string;
  url?: string;
  salary?: {
    min?: number | null;
    max?: number | null;
    currency?: string | null;
    interval?: string | null;
  };
  [key: string]: any; // Allow for additional properties from different APIs
} 