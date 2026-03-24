import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './supabase.js';

/**
 * Extract bearer token from Authorization header.
 */
export function extractToken(req: VercelRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/**
 * Verify token and return user data. Returns null if invalid.
 */
export async function getAuthUser(req: VercelRequest) {
  const token = extractToken(req);
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return null;
  return data.user;
}

/**
 * Middleware-like: require authentication. Sends 401 if not authenticated.
 * Returns the user or null (if response was already sent).
 */
export async function requireAuth(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ data: null, error: 'Unauthorized' });
    return null;
  }
  return user;
}

/**
 * Middleware-like: require admin role. Sends 403 if not admin.
 */
export async function requireAdmin(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    res.status(403).json({ data: null, error: 'Forbidden: admin access required' });
    return null;
  }

  return user;
}
