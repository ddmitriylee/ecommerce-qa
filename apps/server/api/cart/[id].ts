import { cors } from '../../lib/cors.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import { handleError, sendSuccess, methodNotAllowed, NotFoundError, ValidationError } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { id } = req.query as { id: string };
    const supabase = getSupabaseAdmin();

    switch (req.method) {
      case 'PUT': {
        const { quantity } = req.body as { quantity?: number };

        if (!quantity || quantity < 1) {
          throw new ValidationError('quantity (>= 1) is required');
        }

        const { data, error } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('id', id)
          .eq('user_id', user.id)
          .select('*, product:products(*)')
          .single();

        if (error || !data) throw new NotFoundError('Cart item');
        return sendSuccess(res, data);
      }

      case 'DELETE': {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        return sendSuccess(res, { deleted: true });
      }

      default:
        return methodNotAllowed(res);
    }
  } catch (error) {
    return handleError(error, res);
  }
}
