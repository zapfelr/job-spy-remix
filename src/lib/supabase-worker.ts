import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

/**
 * Create a Supabase client for use in Cloudflare Workers
 * @param supabaseUrl Supabase URL
 * @param supabaseKey Supabase service key
 * @returns Supabase client
 */
export function createWorkerSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: fetch.bind(globalThis),
    },
  });
} 