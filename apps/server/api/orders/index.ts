import { cors } from '../../lib/cors.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import { handleError, sendSuccess, methodNotAllowed, ValidationError } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const supabase = getSupabaseAdmin();

    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabase
          .from('orders')
          .select('*, items:order_items(*, product:products(*))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return sendSuccess(res, data);
      }

      case 'POST': {
        // Get user's cart
        const { data: cartItems, error: cartError } = await supabase
          .from('cart_items')
          .select('*, product:products(*)')
          .eq('user_id', user.id);

        if (cartError) throw cartError;
        if (!cartItems || cartItems.length === 0) {
          throw new ValidationError('Cart is empty');
        }

        // Calculate total
        let totalPrice = 0;
        const orderItems = cartItems.map((item: any) => {
          const price = item.product.discount > 0
            ? Math.round(item.product.price * (1 - item.product.discount / 100) * 100) / 100
            : item.product.price;
          totalPrice += price * item.quantity;
          return {
            product_id: item.product_id,
            quantity: item.quantity,
            price,
          };
        });

        totalPrice = Math.round(totalPrice * 100) / 100;

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            total_price: totalPrice,
            status: 'pending',
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const itemsWithOrderId = orderItems.map((item: any) => ({
          ...item,
          order_id: order.id,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId);

        if (itemsError) throw itemsError;

        // Update product stock
        for (const item of cartItems) {
          await supabase
            .from('products')
            .update({ stock: (item.product as any).stock - item.quantity })
            .eq('id', item.product_id);
        }

        // Clear cart
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);

        return sendSuccess(res, order, 201);
      }

      default:
        return methodNotAllowed(res);
    }
  } catch (error) {
    return handleError(error, res);
  }
}
