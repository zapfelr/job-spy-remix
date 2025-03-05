import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Interface for API error data
 */
export interface ApiError {
  companyId: string;
  companyName: string;
  apiType: string;
  error: string;
  timestamp: string;
}

/**
 * Logs API errors to the database for monitoring
 * @param supabase Supabase client
 * @param errorData Error data to log
 */
export async function logError(
  supabase: SupabaseClient,
  errorData: ApiError
): Promise<void> {
  try {
    // In Cloudflare Workers, we can't create tables dynamically
    // So we'll just try to insert directly and handle any errors

    // Log the error to the database
    const { error } = await supabase
      .from('api_errors')
      .insert({
        company_id: errorData.companyId,
        company_name: errorData.companyName,
        api_type: errorData.apiType,
        error_message: errorData.error,
        created_at: errorData.timestamp
      });

    if (error) {
      console.error('Error logging API error to database:', error);
    }
  } catch (error) {
    // Fallback to console logging if database logging fails
    console.error('Failed to log API error to database:', error);
    console.error('Original error:', errorData);
  }
} 