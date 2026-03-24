import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { api } from '../shared/api/client';
import { formatPrice } from '../shared/lib/formatters';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  recentOrders: any[];
}

export function AdminPage() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.profile?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchStats();
  }, [isAuthenticated]);

  const fetchStats = async () => {
    try {
      const { data: res } = await api.get('/admin/stats');
      setStats(res.data);
    } catch {}
    setIsLoading(false);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-300',
    processing: 'bg-blue-500/20 text-blue-300',
    shipped: 'bg-purple-500/20 text-purple-300',
    delivered: 'bg-emerald-500/20 text-emerald-300',
    cancelled: 'bg-red-500/20 text-red-300',
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Products', value: stats?.totalProducts || 0, icon: '📦', color: 'from-blue-500/20 to-blue-600/20' },
          { label: 'Total Orders', value: stats?.totalOrders || 0, icon: '🛒', color: 'from-emerald-500/20 to-emerald-600/20' },
          { label: 'Total Users', value: stats?.totalUsers || 0, icon: '👥', color: 'from-purple-500/20 to-purple-600/20' },
          { label: 'Revenue', value: formatPrice(stats?.totalRevenue || 0), icon: '💰', color: 'from-amber-500/20 to-amber-600/20' },
        ].map((card) => (
          <div key={card.label} className={`glass rounded-2xl p-6 bg-gradient-to-br ${card.color}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <h2 className="text-xl font-bold text-white mb-4">Recent Orders</h2>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(stats?.recentOrders || []).map((order: any) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-slate-300">#{order.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{order.profile?.full_name || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-slate-500/20 text-slate-300'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{formatPrice(order.total_price)}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No orders yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
