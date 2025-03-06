'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = createClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error.message);
      return redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    return redirect('/');
  } catch (err: any) {
    console.error('Login exception:', err);
    return redirect(`/login?error=${encodeURIComponent(err?.message || 'An unexpected error occurred')}`);
  }
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  if (!email || !password) {
    return redirect('/login?error=Email and password are required');
  }
  
  if (password.length < 6) {
    return redirect('/login?error=Password must be at least 6 characters');
  }
  
  try {
    // Log environment variables (masked)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
    console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Not set');
    
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/confirm`,
      },
    });

    if (error) {
      console.error('Signup error:', error.message);
      return redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    return redirect('/login?message=Check your email to confirm your account');
  } catch (err: any) {
    console.error('Signup exception:', err);
    return redirect(`/login?error=${encodeURIComponent(err?.message || 'An unexpected error occurred')}`);
  }
} 