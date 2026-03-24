import { createSupabaseAdmin, type SupabaseClient } from '@ecommerce/config';

let adminClient: SupabaseClient | null = null;

/**
 * Get the Supabase admin client (singleton per cold start).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createSupabaseAdmin();
  }
  return adminClient;
}

/**
 * Create a Supabase client scoped to the requesting user's JWT.
 */
export function getSupabaseForUser(accessToken: string): SupabaseClient {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    }
  );
}
