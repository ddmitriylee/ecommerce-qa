import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProductStore } from './productStore';

vi.mock('../../shared/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '../../shared/api/client';

describe('productStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductStore.setState({
      products: [],
      categories: [],
      selectedProduct: null,
      filters: {},
      total: 0,
      page: 1,
      limit: 12,
      isLoading: false,
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // fetchProducts
  // ─────────────────────────────────────────────────────────────────

  describe('fetchProducts', () => {
    it('TC-STORE-PROD-01: fetches products and sets state', async () => {
      const products = [
        { id: 'p1', title: 'Widget', price: 10 },
        { id: 'p2', title: 'Gadget', price: 20 },
      ];
      vi.mocked(api.get).mockResolvedValue({
        data: { data: products, total: 2 },
      });

      await useProductStore.getState().fetchProducts();

      const state = useProductStore.getState();
      expect(state.products).toHaveLength(2);
      expect(state.total).toBe(2);
      expect(state.isLoading).toBe(false);
    });

    it('TC-STORE-PROD-02: sends filters as query params', async () => {
      useProductStore.setState({
        filters: { category_id: 'cat-1', search: 'widget', min_price: '10', max_price: '100' },
        page: 2,
        limit: 6,
      });
      vi.mocked(api.get).mockResolvedValue({ data: { data: [], total: 0 } });

      await useProductStore.getState().fetchProducts();

      const callUrl = vi.mocked(api.get).mock.calls[0][0];
      expect(callUrl).toContain('category_id=cat-1');
      expect(callUrl).toContain('search=widget');
      expect(callUrl).toContain('min_price=10');
      expect(callUrl).toContain('max_price=100');
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('limit=6');
    });

    it('TC-STORE-PROD-03: handles API error gracefully', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      await useProductStore.getState().fetchProducts();

      expect(useProductStore.getState().isLoading).toBe(false);
    });

    it('TC-STORE-PROD-04: handles null data from API', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { data: null, total: 0 } });

      await useProductStore.getState().fetchProducts();

      expect(useProductStore.getState().products).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // fetchCategories
  // ─────────────────────────────────────────────────────────────────

  describe('fetchCategories', () => {
    it('TC-STORE-PROD-05: fetches and sets categories', async () => {
      const categories = [
        { id: 'c1', name: 'Electronics' },
        { id: 'c2', name: 'Shoes' },
      ];
      vi.mocked(api.get).mockResolvedValue({ data: { data: categories } });

      await useProductStore.getState().fetchCategories();

      expect(useProductStore.getState().categories).toHaveLength(2);
      expect(useProductStore.getState().categories[0].name).toBe('Electronics');
    });

    it('TC-STORE-PROD-06: handles API error on categories', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('fail'));

      await useProductStore.getState().fetchCategories();

      // Should not throw; categories stay empty
      expect(useProductStore.getState().categories).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // fetchProductById
  // ─────────────────────────────────────────────────────────────────

  describe('fetchProductById', () => {
    it('TC-STORE-PROD-07: fetches single product by ID', async () => {
      const product = { id: 'p1', title: 'Widget', price: 10 };
      vi.mocked(api.get).mockResolvedValue({ data: { data: product } });

      await useProductStore.getState().fetchProductById('p1');

      const state = useProductStore.getState();
      expect(state.selectedProduct).toEqual(product);
      expect(state.isLoading).toBe(false);
    });

    it('TC-STORE-PROD-08: handles API error on product fetch', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Not found'));

      await useProductStore.getState().fetchProductById('nonexistent');

      expect(useProductStore.getState().isLoading).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // setFilters
  // ─────────────────────────────────────────────────────────────────

  describe('setFilters', () => {
    it('TC-STORE-PROD-09: sets filters and resets page to 1', () => {
      useProductStore.setState({ page: 3, filters: { search: 'old' } });

      useProductStore.getState().setFilters({ category_id: 'cat-1' });

      const state = useProductStore.getState();
      expect(state.filters.category_id).toBe('cat-1');
      expect(state.filters.search).toBe('old'); // preserved
      expect(state.page).toBe(1); // reset
    });

    it('TC-STORE-PROD-10: merges new filters with existing', () => {
      useProductStore.setState({ filters: { search: 'test', min_price: '5' } });

      useProductStore.getState().setFilters({ search: 'new-search' });

      const state = useProductStore.getState();
      expect(state.filters.search).toBe('new-search');
      expect(state.filters.min_price).toBe('5');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // setPage
  // ─────────────────────────────────────────────────────────────────

  describe('setPage', () => {
    it('TC-STORE-PROD-11: sets page number', () => {
      useProductStore.getState().setPage(5);
      expect(useProductStore.getState().page).toBe(5);
    });

    it('TC-STORE-PROD-12: can set page to 1', () => {
      useProductStore.setState({ page: 10 });
      useProductStore.getState().setPage(1);
      expect(useProductStore.getState().page).toBe(1);
    });
  });
});
