import { create } from 'zustand';
import { api } from '../../shared/api/client';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  discount: number;
  stock: number;
  category_id: string;
  image_url: string | null;
  created_at: string;
  category?: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

interface ProductFilters {
  category_id?: string;
  min_price?: string;
  max_price?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}

interface ProductState {
  products: Product[];
  categories: Category[];
  selectedProduct: Product | null;
  filters: ProductFilters;
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchProductById: (id: string) => Promise<void>;
  setFilters: (filters: Partial<ProductFilters>) => void;
  setPage: (page: number) => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  selectedProduct: null,
  filters: {},
  total: 0,
  page: 1,
  limit: 12,
  isLoading: false,

  fetchProducts: async () => {
    set({ isLoading: true });
    const { filters, page, limit } = get();
    try {
      const params = new URLSearchParams();
      if (filters.category_id) params.set('category_id', filters.category_id);
      if (filters.min_price) params.set('min_price', filters.min_price);
      if (filters.max_price) params.set('max_price', filters.max_price);
      if (filters.search) params.set('search', filters.search);
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (filters.sort_order) params.set('sort_order', filters.sort_order);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const { data: res } = await api.get(`/products?${params.toString()}`);
      set({
        products: res.data || [],
        total: res.total || 0,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const { data: res } = await api.get('/categories');
      set({ categories: res.data || [] });
    } catch {
      // Ignore error
    }
  },

  fetchProductById: async (id) => {
    set({ isLoading: true });
    try {
      const { data: res } = await api.get(`/products/${id}`);
      set({ selectedProduct: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      page: 1,
    }));
  },

  setPage: (page) => set({ page }),
}));
