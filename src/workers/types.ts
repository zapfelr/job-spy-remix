import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export interface Env {
  // API secret for authentication
  API_SECRET: string;
  
  // Supabase credentials
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

// Cloudflare Worker types
export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
} 