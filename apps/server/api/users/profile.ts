import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import { handleError, sendSuccess, methodNotAllowed, NotFoundError } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const supabase = getSupabaseAdmin();

    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error || !data) throw new NotFoundError('Profile');
        return sendSuccess(res, { ...data, email: user.email });
      }

      case 'PUT': {
        const { full_name, phone, address, avatar_url } = req.body;

        const { data, error } = await supabase
          .from('profiles')
          .update({
            full_name,
            phone,
            address,
            avatar_url,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return sendSuccess(res, data);
      }

      default:
        return methodNotAllowed(res);
    }
  } catch (error) {
    return handleError(error, res);
  }
}
