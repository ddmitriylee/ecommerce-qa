import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { api } from '../shared/api/client';
import { formatPrice } from '../shared/lib/formatters';

interface Order {
  id: string;
  total_price: number;
  status: string;
  created_at: string;
  items?: { id: string; quantity: number; price: number; product?: { title: string } }[];
}

export function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const { data: res } = await api.get('/orders');
      setOrders(res.data || []);
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

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Profile card */}
      <div className="glass rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
          {user?.profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{user?.profile?.full_name || 'User'}</h1>
          <p className="text-slate-400 text-sm">{user?.email}</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="px-4 py-2 glass-light rounded-lg text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Orders */}
      <h2 className="text-xl font-bold text-white mb-4">Order History</h2>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-slate-400">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="glass rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3">
                <div>
                  <p className="text-sm font-mono text-slate-400">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-slate-500/20 text-slate-300'}`}>
                    {order.status}
                  </span>
                  <span className="text-lg font-bold text-white">{formatPrice(order.total_price)}</span>
                </div>
              </div>
              {order.items && order.items.length > 0 && (
                <div className="border-t border-white/10 pt-3 space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-400">{item.product?.title || 'Product'} × {item.quantity}</span>
                      <span className="text-slate-300">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
