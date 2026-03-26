import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProductStore } from '../features/catalog/productStore';
import { useCartStore } from '../features/cart/cartStore';
import { useAuthStore } from '../features/auth/authStore';
import { formatPrice, calcDiscountedPrice } from '../shared/lib/formatters';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedProduct, isLoading, fetchProductById } = useProductStore();
  const { addToCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (id) fetchProductById(id);
  }, [id, fetchProductById]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (selectedProduct) {
      await addToCart(selectedProduct.id, qty);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="glass rounded-2xl aspect-square animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-surface-light rounded-lg w-3/4 animate-pulse" />
            <div className="h-4 bg-surface-light rounded w-1/4 animate-pulse" />
            <div className="h-24 bg-surface-light rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!selectedProduct) {
    return (
      <div className="text-center py-20">
        <p className="text-2xl mb-4">😕</p>
        <p className="text-slate-400 mb-4">Product not found</p>
        <Link to="/catalog" className="text-primary-400 hover:text-primary-300">← Back to catalog</Link>
      </div>
    );
  }

  const product = selectedProduct;
  const discountedPrice = calcDiscountedPrice(product.price, product.discount);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400 mb-8">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link to="/catalog" className="hover:text-white transition-colors">Catalog</Link>
        <span>/</span>
        <span className="text-white truncate">{product.title}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Image */}
        <div className="glass rounded-2xl overflow-hidden aspect-square relative">
          {product.discount > 0 && (
            <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-xl z-10">
              -{product.discount}% OFF
            </span>
          )}
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl bg-surface-light">📦</div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <p className="text-primary-400 text-sm font-medium mb-2">
            {product.category?.name || 'Uncategorized'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{product.title}</h1>

          {/* Price */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold text-white">{formatPrice(discountedPrice)}</span>
            {product.discount > 0 && (
              <span className="text-xl text-slate-500 line-through">{formatPrice(product.price)}</span>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2 mb-6">
            {product.stock > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-emerald-400">In stock ({product.stock} available)</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm text-red-400">Out of stock</span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-slate-400 mb-8 leading-relaxed">{product.description}</p>

          {/* Add to cart */}
          {product.stock > 0 && (
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center glass-light rounded-xl overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-4 py-3 text-white hover:bg-white/10 transition-colors"
                >
                  −
                </button>
                <span className="px-4 py-3 text-white font-medium min-w-[48px] text-center">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="px-4 py-3 text-white hover:bg-white/10 transition-colors"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${added
                    ? 'bg-emerald-600'
                    : 'bg-primary-600 hover:bg-primary-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary-500/25'
                  }`}
              >
                {added ? '✓ Added to Cart' : 'Add to Cart'}
              </button>
            </div>
          )}

          {/* Info badges */}
          <div className="grid grid-cols-3 gap-3 mt-auto pt-8">
            {[
              { icon: '🚚', label: 'Free Shipping' },
              { icon: '↩️', label: '30-Day Returns' },
              { icon: '🔒', label: 'Secure Checkout' },
            ].map((badge) => (
              <div key={badge.label} className="glass-light rounded-xl p-3 text-center">
                <span className="text-xl mb-1 block">{badge.icon}</span>
                <span className="text-xs text-slate-400">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
