import { createServerSupabaseClient } from '@/lib/supabase';

// List of admin email addresses
const ADMIN_EMAILS = ['jobspyad@gmail.com'];

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return false;
  }
  
  return ADMIN_EMAILS.includes(session.user.email || '');
}

/**
 * Get the current user's ID
 */
export async function getCurrentUserId() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  return session?.user.id;
} 