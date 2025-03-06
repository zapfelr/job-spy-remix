import { createWorkerSupabaseClient } from '../lib/supabase-worker';
import { Database } from '../types/database';
import { SupabaseClient } from '@supabase/supabase-js';

// Define types for Cloudflare Workers
export interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  API_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

/**
 * Creates a Supabase client for the worker
 */
function createSupabaseClient(env: Env): SupabaseClient<Database> {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL');
  }
  
  if (!supabaseKey) {
    throw new Error('Missing Supabase service key');
  }
  
  console.log(`Creating Supabase client with URL: ${supabaseUrl}`);
  
  return createWorkerSupabaseClient(supabaseUrl, supabaseKey);
}

/**
 * Cleans up job changes older than 90 days
 */
export async function cleanupOldJobChanges(env: Env) {
  console.log('Starting cleanup of old job changes');
  
  const supabase = createSupabaseClient(env);
  
  try {
    // Calculate the date 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = ninetyDaysAgo.toISOString();
    
    console.log(`Deleting job changes older than ${cutoffDate}`);
    
    // Delete job changes older than 90 days
    const { data, error, count } = await supabase
      .from('job_changes')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate);
    
    if (error) {
      console.error('Error cleaning up old job changes:', error);
      return;
    }
    
    console.log(`Successfully deleted ${count} old job changes`);
  } catch (error) {
    console.error('Error in cleanupOldJobChanges:', error);
  }
}

/**
 * Cloudflare Worker handler
 */
export default {
  // Run daily at 3:00 AM UTC
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(cleanupOldJobChanges(env));
  },
  
  // Allow manual triggering via HTTP request
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Check if the request has the correct API secret
    const url = new URL(request.url);
    const apiSecret = url.searchParams.get('secret');
    
    if (apiSecret !== env.API_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Start the cleanup process
    ctx.waitUntil(cleanupOldJobChanges(env));
    
    return new Response('Job changes cleanup started', { status: 200 });
  }
}; 