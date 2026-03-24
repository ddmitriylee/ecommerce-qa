import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import { handleError, sendSuccess, methodNotAllowed, ValidationError } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const supabase = getSupabaseAdmin();

    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabase
          .from('cart_items')
          .select('*, product:products(*)')
          .eq('user_id', user.id);

        if (error) throw error;
        return sendSuccess(res, data);
      }

      case 'POST': {
        const { product_id, quantity } = req.body as {
          product_id?: string;
          quantity?: number;
        };

        if (!product_id || !quantity || quantity < 1) {
          throw new ValidationError('product_id and quantity (>= 1) are required');
        }

        // Check if item already in cart
        const { data: existing } = await supabase
          .from('cart_items')
          .select('id, quantity')
          .eq('user_id', user.id)
          .eq('product_id', product_id)
          .single();

        let result;
        if (existing) {
          // Update quantity
          const { data, error } = await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id)
            .select('*, product:products(*)')
            .single();
          if (error) throw error;
          result = data;
        } else {
          // Insert new
          const { data, error } = await supabase
            .from('cart_items')
            .insert({ user_id: user.id, product_id, quantity })
            .select('*, product:products(*)')
            .single();
          if (error) throw error;
          result = data;
        }

        return sendSuccess(res, result, 201);
      }

      case 'DELETE': {
        // Clear entire cart
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;
        return sendSuccess(res, { cleared: true });
      }

      default:
        return methodNotAllowed(res);
    }
  } catch (error) {
    return handleError(error, res);
  }
}
