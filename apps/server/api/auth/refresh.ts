import { cors } from '../../lib/cors.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { handleError, sendSuccess, methodNotAllowed, ValidationError } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    const { refresh_token } = req.body as { refresh_token?: string };

    if (!refresh_token) {
      throw new ValidationError('refresh_token is required');
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error) {
      throw new ValidationError(error.message);
    }

    return sendSuccess(res, {
      session: data.session,
    });
  } catch (error) {
    return handleError(error, res);
  }
}
