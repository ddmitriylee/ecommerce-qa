import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for public (anon) usage.
 */
export function createSupabaseClient(
  url?: string,
  anonKey?: string
): SupabaseClient {
  const supabaseUrl = url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = anonKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Create a Supabase admin client (service role — server-side only!).
 */
export function createSupabaseAdmin(
  url?: string,
  serviceRoleKey?: string
): SupabaseClient {
  const supabaseUrl = url || process.env.SUPABASE_URL || '';
  const supabaseServiceKey = serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { type SupabaseClient } from '@supabase/supabase-js';
