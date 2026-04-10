import { describe, it, expect } from 'vitest';
import { formatPrice, calcDiscountedPrice, truncate, isValidEmail, delay, toQueryString } from './index.js';

// ─────────────────────────────────────────────────────────────────────────────
// formatPrice
// ─────────────────────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('TC-UTIL-UNIT-01: formats whole number as USD', () => {
    expect(formatPrice(10)).toBe('$10.00');
  });

  it('TC-UTIL-UNIT-02: formats decimal number as USD', () => {
    expect(formatPrice(29.99)).toBe('$29.99');
  });

  it('TC-UTIL-UNIT-03: formats zero as $0.00', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('TC-UTIL-UNIT-04: formats large numbers with comma separator', () => {
    const result = formatPrice(1234567.89);
    expect(result).toContain('1,234,567.89');
  });

  it('TC-UTIL-EDGE-01: formats negative prices', () => {
    const result = formatPrice(-10.50);
    expect(result).toContain('10.50');
  });

  it('TC-UTIL-UNIT-05: uses custom currency when provided', () => {
    const result = formatPrice(100, 'EUR');
    expect(result).toContain('100');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcDiscountedPrice
// ─────────────────────────────────────────────────────────────────────────────

describe('calcDiscountedPrice', () => {
  it('TC-UTIL-UNIT-06: applies 20% discount correctly', () => {
    expect(calcDiscountedPrice(100, 20)).toBe(80);
  });

  it('TC-UTIL-UNIT-07: applies 50% discount correctly', () => {
    expect(calcDiscountedPrice(200, 50)).toBe(100);
  });

  it('TC-UTIL-UNIT-08: returns original price when discount is 0', () => {
    expect(calcDiscountedPrice(50, 0)).toBe(50);
  });

  it('TC-UTIL-EDGE-02: returns original price when discount is negative', () => {
    expect(calcDiscountedPrice(50, -10)).toBe(50);
  });

  it('TC-UTIL-UNIT-09: handles decimal prices with rounding', () => {
    // 29.99 * 0.85 = 25.4915 → rounded to 25.49
    expect(calcDiscountedPrice(29.99, 15)).toBe(25.49);
  });

  it('TC-UTIL-UNIT-10: 100% discount returns 0', () => {
    expect(calcDiscountedPrice(100, 100)).toBe(0);
  });

  it('TC-UTIL-EDGE-03: handles very small prices', () => {
    const result = calcDiscountedPrice(0.01, 50);
    expect(result).toBe(0.01); // 0.005 rounds to 0.01
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// truncate
// ─────────────────────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('TC-UTIL-UNIT-11: returns original text when under maxLength', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('TC-UTIL-UNIT-12: returns original text when exactly maxLength', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('TC-UTIL-UNIT-13: truncates with ellipsis when over maxLength', () => {
    expect(truncate('Hello World', 5)).toBe('Hello…');
  });

  it('TC-UTIL-EDGE-04: trims trailing whitespace before ellipsis', () => {
    expect(truncate('Hello World Here', 6)).toBe('Hello…');
  });

  it('TC-UTIL-EDGE-05: handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('TC-UTIL-EDGE-06: handles maxLength of 0', () => {
    expect(truncate('Hello', 0)).toBe('…');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isValidEmail
// ─────────────────────────────────────────────────────────────────────────────

describe('isValidEmail', () => {
  it('TC-UTIL-UNIT-14: returns true for valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('TC-UTIL-UNIT-15: returns true for email with subdomain', () => {
    expect(isValidEmail('user@mail.example.com')).toBe(true);
  });

  it('TC-UTIL-FAIL-01: returns false for email without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('TC-UTIL-FAIL-02: returns false for email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('TC-UTIL-FAIL-03: returns false for email without TLD', () => {
    expect(isValidEmail('user@example')).toBe(false);
  });

  it('TC-UTIL-FAIL-04: returns false for email with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  it('TC-UTIL-FAIL-05: returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('TC-UTIL-UNIT-16: returns true for email with + alias', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// delay
// ─────────────────────────────────────────────────────────────────────────────

describe('delay', () => {
  it('TC-UTIL-UNIT-17: returns a promise that resolves after specified ms', async () => {
    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it('TC-UTIL-UNIT-18: resolves with undefined', async () => {
    const result = await delay(10);
    expect(result).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toQueryString
// ─────────────────────────────────────────────────────────────────────────────

describe('toQueryString', () => {
  it('TC-UTIL-UNIT-19: creates query string from object', () => {
    expect(toQueryString({ page: 1, limit: 10 })).toBe('?page=1&limit=10');
  });

  it('TC-UTIL-UNIT-20: skips undefined values', () => {
    expect(toQueryString({ page: 1, search: undefined })).toBe('?page=1');
  });

  it('TC-UTIL-UNIT-21: skips null values', () => {
    expect(toQueryString({ page: 1, filter: null })).toBe('?page=1');
  });

  it('TC-UTIL-UNIT-22: skips empty string values', () => {
    expect(toQueryString({ page: 1, search: '' })).toBe('?page=1');
  });

  it('TC-UTIL-UNIT-23: returns empty string when all values are undefined', () => {
    expect(toQueryString({ a: undefined, b: null, c: '' })).toBe('');
  });

  it('TC-UTIL-UNIT-24: returns empty string for empty object', () => {
    expect(toQueryString({})).toBe('');
  });

  it('TC-UTIL-UNIT-25: encodes special characters', () => {
    const result = toQueryString({ search: 'hello world' });
    expect(result).toBe('?search=hello%20world');
  });

  it('TC-UTIL-EDGE-07: handles boolean values', () => {
    const result = toQueryString({ active: true, deleted: false });
    expect(result).toBe('?active=true&deleted=false');
  });
});
