import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { handleError, sendSuccess, methodNotAllowed } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res);

  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const supabase = getSupabaseAdmin();

    // Total products
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Total orders
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Revenue (sum of delivered orders)
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_price')
      .eq('status', 'delivered');

    const totalRevenue = revenueData?.reduce((sum: number, o: any) => sum + o.total_price, 0) || 0;

    // Recent orders
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*, profile:profiles!orders_user_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(10);

    return sendSuccess(res, {
      totalProducts: totalProducts || 0,
      totalOrders: totalOrders || 0,
      totalUsers: totalUsers || 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      recentOrders: recentOrders || [],
    });
  } catch (error) {
    return handleError(error, res);
  }
}
