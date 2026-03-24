import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { handleError, sendSuccess, methodNotAllowed, NotFoundError } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query as { id: string };
    const supabase = getSupabaseAdmin();

    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('id', id)
          .single();

        if (error || !data) throw new NotFoundError('Product');
        return sendSuccess(res, data);
      }

      case 'PUT': {
        const { requireAdmin } = await import('../../lib/auth.js');
        const user = await requireAdmin(req, res);
        if (!user) return;

        const { data, error } = await supabase
          .from('products')
          .update(req.body)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new NotFoundError('Product');
        return sendSuccess(res, data);
      }

      case 'DELETE': {
        const { requireAdmin } = await import('../../lib/auth.js');
        const user = await requireAdmin(req, res);
        if (!user) return;

        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

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
