import { describe, it, expect } from 'vitest';
import { formatPrice, calcDiscountedPrice } from '../shared/lib/formatters';

describe('formatters', () => {
  describe('formatPrice', () => {
    it('formats price in USD', () => {
      expect(formatPrice(10)).toBe('$10.00');
      expect(formatPrice(10.99)).toBe('$10.99');
      expect(formatPrice(0)).toBe('$0.00');
    });
  });

  describe('calcDiscountedPrice', () => {
    it('returns original price when discount is 0', () => {
      expect(calcDiscountedPrice(100, 0)).toBe(100);
    });

    it('calculates discounted price correctly', () => {
      expect(calcDiscountedPrice(100, 20)).toBe(80);
      expect(calcDiscountedPrice(100, 15)).toBe(85);
      expect(calcDiscountedPrice(49.99, 10)).toBe(44.99);
    });

    it('handles negative discount as no discount', () => {
      expect(calcDiscountedPrice(100, -5)).toBe(100);
    });
  });
});
