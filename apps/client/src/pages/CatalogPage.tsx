import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProductStore } from '../features/catalog/productStore';
import { useDebounce } from '../shared/hooks/useDebounce';
import { formatPrice, calcDiscountedPrice } from '../shared/lib/formatters';

export function CatalogPage() {
  const {
    products, categories, total, page, limit, isLoading,
    fetchProducts, fetchCategories, setFilters, setPage, filters,
  } = useProductStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    fetchCategories();
    // Load filters from URL
    const urlFilters: Record<string, string> = {};
    searchParams.forEach((v, k) => { urlFilters[k] = v; });
    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }
  }, []);

  useEffect(() => {
    setFilters({ search: debouncedSearch || undefined });
  }, [debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [filters, page]);

  const totalPages = Math.ceil(total / limit);

  const handleCategoryFilter = (categoryId: string) => {
    if (filters.category_id === categoryId) {
      setFilters({ category_id: undefined });
    } else {
      setFilters({ category_id: categoryId });
    }
  };

  const handleSort = (value: string) => {
    const [sort_by, sort_order] = value.split(':');
    setFilters({ sort_by, sort_order });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-8">Catalog</h1>

      {/* Filters bar */}
      <div className="glass rounded-2xl p-4 mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-light rounded-xl text-sm text-white placeholder-slate-500 border border-white/10 focus:border-primary-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Sort */}
        <select
          onChange={(e) => handleSort(e.target.value)}
          className="px-4 py-2.5 bg-surface-light rounded-xl text-sm text-white border border-white/10 focus:border-primary-500 focus:outline-none"
          defaultValue="created_at:desc"
        >
          <option value="created_at:desc">Newest</option>
          <option value="price:asc">Price: Low → High</option>
          <option value="price:desc">Price: High → Low</option>
          <option value="title:asc">Name: A → Z</option>
        </select>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setFilters({ category_id: undefined })}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            !filters.category_id
              ? 'bg-primary-600 text-white'
              : 'glass-light text-slate-300 hover:text-white'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryFilter(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filters.category_id === cat.id
                ? 'bg-primary-600 text-white'
                : 'glass-light text-slate-300 hover:text-white'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-80 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-slate-400">No products found. Try different filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, idx) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="glass rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="aspect-square overflow-hidden bg-surface-light relative">
                {product.discount > 0 && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg z-10">
                    -{product.discount}%
                  </span>
                )}
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
                <p className="text-xs text-primary-400 font-medium mb-1">{(product as any).category?.name}</p>
                <h3 className="text-sm font-semibold text-white line-clamp-2 mb-2 group-hover:text-primary-300 transition-colors">
                  {product.title}
                </h3>
                <div className="flex items-center gap-2">
                  {product.discount > 0 ? (
                    <>
                      <span className="text-lg font-bold text-white">{formatPrice(calcDiscountedPrice(product.price, product.discount))}</span>
                      <span className="text-sm text-slate-500 line-through">{formatPrice(product.price)}</span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-white">{formatPrice(product.price)}</span>
                  )}
                </div>
                {product.stock <= 5 && product.stock > 0 && (
                  <p className="text-xs text-amber-400 mt-2">Only {product.stock} left!</p>
                )}
                {product.stock === 0 && (
                  <p className="text-xs text-red-400 mt-2">Out of stock</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-12">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 glass-light rounded-lg text-sm text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Prev
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                page === i + 1
                  ? 'bg-primary-600 text-white'
                  : 'glass-light text-slate-300 hover:text-white'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 glass-light rounded-lg text-sm text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
