import { cors } from '../../lib/cors.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { handleError, sendSuccess, methodNotAllowed } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return methodNotAllowed(res);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return sendSuccess(res, data);
  } catch (error) {
    return handleError(error, res);
  }
}
