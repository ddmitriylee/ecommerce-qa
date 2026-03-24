import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../features/cart/cartStore';
import { useAuthStore } from '../features/auth/authStore';
import { formatPrice, calcDiscountedPrice } from '../shared/lib/formatters';

export function CartPage() {
  const { items, totalPrice, totalItems, isLoading, fetchCart, updateQuantity, removeItem, clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchCart();
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-8">
        Shopping Cart
        {totalItems > 0 && <span className="text-slate-400 text-lg ml-3">({totalItems} items)</span>}
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-xl text-white mb-2">Your cart is empty</p>
          <p className="text-slate-400 mb-6">Browse our catalog and find something you love!</p>
          <Link to="/catalog" className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-all">
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const product = item.product;
              if (!product) return null;
              const price = calcDiscountedPrice(product.price, product.discount);
              return (
                <div key={item.id} className="glass rounded-2xl p-4 flex gap-4 items-center animate-slide-up">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-light flex-shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${product.id}`} className="text-sm font-semibold text-white hover:text-primary-300 transition-colors line-clamp-1">
                      {product.title}
                    </Link>
                    <p className="text-sm text-primary-400 mt-1">{formatPrice(price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center glass-light rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="px-3 py-1.5 text-white text-sm hover:bg-white/10 transition-colors"
                      >
                        −
                      </button>
                      <span className="px-3 py-1.5 text-white text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1.5 text-white text-sm hover:bg-white/10 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-white font-semibold min-w-[80px] text-right">
                      {formatPrice(price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
            <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-300 transition-colors">
              Clear cart
            </button>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-bold text-white mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal ({totalItems} items)</span>
                  <span className="text-white">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Shipping</span>
                  <span className="text-emerald-400">Free</span>
                </div>
                <hr className="border-white/10" />
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Total</span>
                  <span className="text-xl font-bold text-white">{formatPrice(totalPrice)}</span>
                </div>
              </div>
              <Link
                to="/checkout"
                className="block w-full py-3 bg-primary-600 hover:bg-primary-500 text-white text-center rounded-xl font-semibold transition-all hover:scale-[1.02]"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
