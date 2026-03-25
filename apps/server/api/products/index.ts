import { cors } from '../../lib/cors.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { handleError, sendSuccess, methodNotAllowed } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  try {
    const supabase = getSupabaseAdmin();

    switch (req.method) {
      case 'GET': {
        const {
          category_id,
          min_price,
          max_price,
          search,
          sort_by = 'created_at',
          sort_order = 'desc',
          page = '1',
          limit = '12',
        } = req.query as Record<string, string>;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        let query = supabase
          .from('products')
          .select('*, category:categories(*)', { count: 'exact' });

        if (category_id) query = query.eq('category_id', category_id);
        if (min_price) query = query.gte('price', parseFloat(min_price));
        if (max_price) query = query.lte('price', parseFloat(max_price));
        if (search) query = query.ilike('title', `%${search}%`);

        query = query.order(sort_by, { ascending: sort_order === 'asc' });
        query = query.range(from, to);

        const { data, count, error } = await query;

        if (error) throw error;

        return res.status(200).json({
          data,
          error: null,
          total: count || 0,
          page: pageNum,
          limit: limitNum,
        });
      }

      case 'POST': {
        // Admin-only: create product
        const { requireAdmin } = await import('../../lib/auth.js');
        const user = await requireAdmin(req, res);
        if (!user) return;

        const { title, description, price, discount, stock, category_id, image_url } = req.body;

        const { data, error } = await supabase
          .from('products')
          .insert({ title, description, price, discount: discount || 0, stock, category_id, image_url })
          .select()
          .single();

        if (error) throw error;
        return sendSuccess(res, data, 201);
      }

      default:
        return methodNotAllowed(res);
    }
  } catch (error) {
    return handleError(error, res);
  }
}
