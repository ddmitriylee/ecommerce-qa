import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../features/cart/cartStore';
import { api } from '../shared/api/client';
import { formatPrice } from '../shared/lib/formatters';

export function CheckoutPage() {
  const { totalPrice, items } = useCartStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await api.post('/orders');
      navigate('/profile');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>

      <div className="space-y-6">
        {/* Order review */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Order Review</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-light">
                    {item.product?.image_url ? (
                      <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">📦</div>
                    )}
                  </div>
                  <span className="text-slate-300">{item.product?.title} × {item.quantity}</span>
                </div>
                <span className="text-white font-medium">
                  {item.product && formatPrice(item.product.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <hr className="my-4 border-white/10" />
          <div className="flex justify-between text-lg font-bold">
            <span className="text-white">Total</span>
            <span className="text-white">{formatPrice(totalPrice)}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handlePlaceOrder}
          disabled={isSubmitting}
          className="w-full py-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg transition-all hover:scale-[1.01]"
        >
          {isSubmitting ? 'Placing Order...' : 'Place Order'}
        </button>

        <p className="text-xs text-slate-500 text-center">
          By placing your order, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
