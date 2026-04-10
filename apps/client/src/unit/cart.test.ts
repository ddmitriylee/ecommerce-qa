import { describe, it, expect } from 'vitest';
import { calcTotals } from '../features/cart/cartStore';

describe('cart logic', () => {
  describe('calcTotals', () => {
    it('calculates totals for empty cart', () => {
      expect(calcTotals([])).toEqual({ totalItems: 0, totalPrice: 0 });
    });

    it('calculates totals correctly without discounts', () => {
      const items = [
        {
          id: '1',
          product_id: 'p1',
          quantity: 2,
          product: { id: 'p1', title: 'Product 1', price: 10, discount: 0, image_url: null, stock: 10 }
        },
        {
          id: '2',
          product_id: 'p2',
          quantity: 1,
          product: { id: 'p2', title: 'Product 2', price: 50, discount: 0, image_url: null, stock: 5 }
        }
      ];
      expect(calcTotals(items)).toEqual({ totalItems: 3, totalPrice: 70 });
    });

    it('calculates totals correctly with discounts', () => {
      const items = [
        {
          id: '1',
          product_id: 'p1',
          quantity: 1,
          product: { id: 'p1', title: 'Product 1', price: 100, discount: 10, image_url: null, stock: 10 }
        }
      ];
      // $100 - 10% = $90
      expect(calcTotals(items)).toEqual({ totalItems: 1, totalPrice: 90 });
    });

    it('handles floating point math correctly', () => {
      const items = [
        {
          id: '1',
          product_id: 'p1',
          quantity: 1,
          product: { id: 'p1', title: 'Product 1', price: 49.99, discount: 15, image_url: null, stock: 10 }
        }
      ];
      // 49.99 * 0.85 = 42.4915 -> 42.49
      expect(calcTotals(items)).toEqual({ totalItems: 1, totalPrice: 42.49 });
    });
  });
});
