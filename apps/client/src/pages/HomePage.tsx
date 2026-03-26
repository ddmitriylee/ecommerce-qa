import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useProductStore } from '../features/catalog/productStore';
import { formatPrice, calcDiscountedPrice } from '../shared/lib/formatters';

export function HomePage() {
  const { products, categories, fetchProducts, fetchCategories, isLoading } = useProductStore();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const featured = products.slice(0, 4);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/50 via-transparent to-primary-800/30" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
            <span className="text-white">Discover</span>{' '}
            <span className="bg-gradient-to-r from-primary-400 via-primary-300 to-primary-500 bg-clip-text text-transparent">
              Premium
            </span>
            <br />
            <span className="text-white">Products</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
            Curated collection of the finest products. Shop with confidence and style on our next-generation platform.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/catalog"
              className="px-8 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary-500/25"
            >
              Browse Catalog
            </Link>
            <Link
              to="/register"
              className="px-8 py-3 glass-light hover:bg-white/10 text-white rounded-xl font-semibold text-lg transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/catalog?category_id=${cat.id}`}
                className="glass rounded-xl p-6 text-center hover:bg-white/10 transition-all hover:scale-105 group"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-gradient-to-br from-primary-400/20 to-primary-600/20 flex items-center justify-center group-hover:from-primary-400/40 group-hover:to-primary-600/40 transition-all">
                  <span className="text-2xl">
                    {cat.name === 'Electronics' && '⚡'}
                    {cat.name === 'Clothing' && '👕'}
                    {cat.name === 'Home & Garden' && '🏡'}
                    {cat.name === 'Sports & Outdoors' && '🏋️'}
                    {cat.name === 'Books' && '📚'}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Featured Products</h2>
            <Link to="/catalog" className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors">
              View All →
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass rounded-2xl h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((product, idx) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="glass rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="aspect-square overflow-hidden bg-surface-light">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-primary-400 font-medium mb-1">{product.category?.name}</p>
                    <h3 className="text-sm font-semibold text-white line-clamp-2 mb-2 group-hover:text-primary-300 transition-colors">
                      {product.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {product.discount > 0 ? (
                        <>
                          <span className="text-lg font-bold text-white">{formatPrice(calcDiscountedPrice(product.price, product.discount))}</span>
                          <span className="text-sm text-slate-500 line-through">{formatPrice(product.price)}</span>
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">-{product.discount}%</span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-white">{formatPrice(product.price)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="glass rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-primary-800/10" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Shop?</h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                Join thousands of happy customers and discover our curated collection.
              </p>
              <Link
                to="/register"
                className="inline-block px-8 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary-500/25"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
