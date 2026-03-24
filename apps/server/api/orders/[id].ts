import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import { handleError, sendSuccess, methodNotAllowed, NotFoundError } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { id } = req.query as { id: string };
    const supabase = getSupabaseAdmin();

    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabase
          .from('orders')
          .select('*, items:order_items(*, product:products(*))')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error || !data) throw new NotFoundError('Order');
        return sendSuccess(res, data);
      }

      case 'PUT': {
        // Admin can update status
        const { requireAdmin } = await import('../../lib/auth.js');
        const admin = await requireAdmin(req, res);
        if (!admin) return;

        const { status } = req.body as { status?: string };
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

        if (!status || !validStatuses.includes(status)) {
          return res.status(400).json({
            data: null,
            error: `status must be one of: ${validStatuses.join(', ')}`,
          });
        }

        const { data, error } = await supabase
          .from('orders')
          .update({ status })
          .eq('id', id)
          .select()
          .single();

        if (error || !data) throw new NotFoundError('Order');
        return sendSuccess(res, data);
      }

      default:
        return methodNotAllowed(res);
    }
  } catch (error) {
    return handleError(error, res);
  }
}
