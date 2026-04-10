import { describe, it, expect } from 'vitest';
import { formatPrice, calcDiscountedPrice } from './formatters';

// ─────────────────────────────────────────────────────────────────────────────
// formatPrice
// ─────────────────────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('TC-FMT-UNIT-01: formats integer as USD currency', () => {
    expect(formatPrice(10)).toBe('$10.00');
  });

  it('TC-FMT-UNIT-02: formats decimal as USD currency', () => {
    expect(formatPrice(29.99)).toBe('$29.99');
  });

  it('TC-FMT-UNIT-03: formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('TC-FMT-UNIT-04: formats large numbers with comma grouping', () => {
    const result = formatPrice(1234567.89);
    expect(result).toContain('1,234,567.89');
  });

  it('TC-FMT-EDGE-01: handles negative numbers', () => {
    const result = formatPrice(-15.5);
    expect(result).toContain('15.50');
  });

  it('TC-FMT-EDGE-02: rounds 3+ decimals to 2 places', () => {
    const result = formatPrice(10.999);
    expect(result).toBe('$11.00');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcDiscountedPrice
// ─────────────────────────────────────────────────────────────────────────────

describe('calcDiscountedPrice', () => {
  it('TC-FMT-UNIT-05: applies 20% discount', () => {
    expect(calcDiscountedPrice(100, 20)).toBe(80);
  });

  it('TC-FMT-UNIT-06: applies 50% discount', () => {
    expect(calcDiscountedPrice(200, 50)).toBe(100);
  });

  it('TC-FMT-UNIT-07: returns original price when discount is 0', () => {
    expect(calcDiscountedPrice(50, 0)).toBe(50);
  });

  it('TC-FMT-EDGE-03: returns original price when discount is negative', () => {
    expect(calcDiscountedPrice(50, -10)).toBe(50);
  });

  it('TC-FMT-UNIT-08: rounds to 2 decimal places', () => {
    // 29.99 * 0.85 = 25.4915 → 25.49
    expect(calcDiscountedPrice(29.99, 15)).toBe(25.49);
  });

  it('TC-FMT-UNIT-09: 100% discount returns 0', () => {
    expect(calcDiscountedPrice(100, 100)).toBe(0);
  });

  it('TC-FMT-EDGE-04: handles very small prices', () => {
    expect(calcDiscountedPrice(0.01, 50)).toBe(0.01);
  });

  it('TC-FMT-UNIT-10: handles 10% discount on $9.99', () => {
    // 9.99 * 0.9 = 8.991 → 8.99
    expect(calcDiscountedPrice(9.99, 10)).toBe(8.99);
  });
});
