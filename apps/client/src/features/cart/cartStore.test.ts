import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCartStore } from './cartStore';

vi.mock('../../shared/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '../../shared/api/client';

describe('cartStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({
      items: [],
      isLoading: false,
      totalItems: 0,
      totalPrice: 0,
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // fetchCart
  // ─────────────────────────────────────────────────────────────────

  describe('fetchCart', () => {
    it('TC-STORE-CART-01: fetches cart items and computes totals', async () => {
      const items = [
        { id: 'ci-1', product_id: 'p1', quantity: 2, product: { id: 'p1', title: 'A', price: 10, discount: 0, stock: 5, image_url: null } },
        { id: 'ci-2', product_id: 'p2', quantity: 1, product: { id: 'p2', title: 'B', price: 20, discount: 10, stock: 3, image_url: null } },
      ];
      vi.mocked(api.get).mockResolvedValue({ data: { data: items } });

      await useCartStore.getState().fetchCart();

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.totalItems).toBe(3); // 2 + 1
      // Price: (10 * 2) + (20 * 0.9 * 1) = 20 + 18 = 38
      expect(state.totalPrice).toBe(38);
      expect(state.isLoading).toBe(false);
    });

    it('TC-STORE-CART-02: sets empty cart on API error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      await useCartStore.getState().fetchCart();

      const state = useCartStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('TC-STORE-CART-03: handles null data from API', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { data: null } });

      await useCartStore.getState().fetchCart();

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.totalItems).toBe(0);
      expect(state.totalPrice).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // addToCart
  // ─────────────────────────────────────────────────────────────────

  describe('addToCart', () => {
    it('TC-STORE-CART-04: calls API and refreshes cart', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { data: {} } });
      vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });

      await useCartStore.getState().addToCart('product-1', 2);

      expect(api.post).toHaveBeenCalledWith('/cart', { product_id: 'product-1', quantity: 2 });
      expect(api.get).toHaveBeenCalledWith('/cart');
    });

    it('TC-STORE-CART-05: uses default quantity of 1', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { data: {} } });
      vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });

      await useCartStore.getState().addToCart('product-1');

      expect(api.post).toHaveBeenCalledWith('/cart', { product_id: 'product-1', quantity: 1 });
    });

    it('TC-STORE-CART-06: silently handles API errors on add', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Server error'));

      // Should not throw
      await useCartStore.getState().addToCart('product-1');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // updateQuantity
  // ─────────────────────────────────────────────────────────────────

  describe('updateQuantity', () => {
    it('TC-STORE-CART-07: calls PUT API and refreshes cart', async () => {
      vi.mocked(api.put).mockResolvedValue({ data: { data: {} } });
      vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });

      await useCartStore.getState().updateQuantity('ci-1', 5);

      expect(api.put).toHaveBeenCalledWith('/cart/ci-1', { quantity: 5 });
      expect(api.get).toHaveBeenCalledWith('/cart');
    });

    it('TC-STORE-CART-08: silently handles API errors on update', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('Server error'));

      await useCartStore.getState().updateQuantity('ci-1', 3);
      // Should not throw
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // removeItem
  // ─────────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('TC-STORE-CART-09: calls DELETE API and refreshes cart', async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: { data: {} } });
      vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });

      await useCartStore.getState().removeItem('ci-1');

      expect(api.delete).toHaveBeenCalledWith('/cart/ci-1');
      expect(api.get).toHaveBeenCalledWith('/cart');
    });

    it('TC-STORE-CART-10: silently handles API errors on remove', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Server error'));

      await useCartStore.getState().removeItem('ci-1');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // clearCart
  // ─────────────────────────────────────────────────────────────────

  describe('clearCart', () => {
    it('TC-STORE-CART-11: clears cart via API and resets state', async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: { data: {} } });
      useCartStore.setState({
        items: [{ id: 'ci-1', product_id: 'p1', quantity: 1 }],
        totalItems: 1,
        totalPrice: 10,
      });

      await useCartStore.getState().clearCart();

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.totalItems).toBe(0);
      expect(state.totalPrice).toBe(0);
      expect(api.delete).toHaveBeenCalledWith('/cart');
    });

    it('TC-STORE-CART-12: silently handles API errors on clear', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Server error'));

      await useCartStore.getState().clearCart();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // calcTotals (internal function tested through fetchCart)
  // ─────────────────────────────────────────────────────────────────

  describe('calcTotals (via fetchCart)', () => {
    it('TC-STORE-CART-13: correctly totals items without discounts', async () => {
      const items = [
        { id: 'ci-1', product_id: 'p1', quantity: 3, product: { id: 'p1', title: 'A', price: 10, discount: 0, stock: 5, image_url: null } },
      ];
      vi.mocked(api.get).mockResolvedValue({ data: { data: items } });

      await useCartStore.getState().fetchCart();

      expect(useCartStore.getState().totalPrice).toBe(30);
      expect(useCartStore.getState().totalItems).toBe(3);
    });

    it('TC-STORE-CART-14: handles items without product data', async () => {
      const items = [
        { id: 'ci-1', product_id: 'p1', quantity: 2 }, // no product
      ];
      vi.mocked(api.get).mockResolvedValue({ data: { data: items } });

      await useCartStore.getState().fetchCart();

      expect(useCartStore.getState().totalItems).toBe(2);
      expect(useCartStore.getState().totalPrice).toBe(0); // no product, no price
    });
  });
});
