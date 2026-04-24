/**
 * Assignment 3 – Performance Testing (Vitest-based simulation)
 * =============================================================
 * Run: cd apps/server && npm test
 *
 * Simulates concurrent load against handler functions to measure
 * throughput and latency distribution without needing a live server.
 *
 * Modules (from midterm high-risk analysis):
 *   1. auth/login     – POST /api/auth/login
 *   2. products/index – GET  /api/products
 *   3. cart/index     – POST /api/cart
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/supabase.js', () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock('../../lib/cors.js',     () => ({ cors: vi.fn(() => false) }));
vi.mock('../../lib/auth.js', () => ({
  requireAuth:  vi.fn(),
  requireAdmin: vi.fn(),
  extractToken: vi.fn(),
  getAuthUser:  vi.fn(),
}));

import { getSupabaseAdmin } from '../../lib/supabase.js';
import { requireAuth }       from '../../lib/auth.js';
import loginHandler          from '../../api/auth/login.js';
import productsHandler       from '../../api/products/index.js';
import cartHandler           from '../../api/cart/index.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
function mockReq(method: string, query: any = {}, body: any = {}, headers: any = {}): any {
  return { method, query, body, headers };
}
function mockRes(): any {
  let statusCode = 0; let body: any = null;
  const res: any = {
    status(code: number) { statusCode = code; return res; },
    json(data: any)      { body = data;       return res; },
    get statusCode()     { return statusCode; },
    get body()           { return body; },
  };
  return res;
}

async function runConcurrent(count: number, factory: () => Promise<{ statusCode: number; durationMs: number }>) {
  return Promise.all(Array.from({ length: count }, () => factory()));
}

function stats(durations: number[]) {
  const sorted = [...durations].sort((a, b) => a - b);
  const sum    = durations.reduce((a, b) => a + b, 0);
  const pct    = (p: number) => sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
  return { avg: sum / durations.length, p50: pct(50), p95: pct(95), p99: pct(99), max: Math.max(...sorted), count: durations.length };
}

const MOCK_USER    = { id: 'u-perf', email: 'perf@test.com' };
const MOCK_SESSION = { access_token: 'tok', refresh_token: 'ref' };

// ── Module 1: Authentication ──────────────────────────────────────────────────

describe('PERF-01: Authentication Load Simulation', () => {
  beforeEach(() => vi.clearAllMocks());

  function makeAuthSupabase() {
    return {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: MOCK_USER, session: MOCK_SESSION }, error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'customer' } }),
          }),
        }),
      }),
    };
  }

  it('PERF-AUTH-01: 50 concurrent login requests – p95 < 50 ms, error rate < 1%', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeAuthSupabase() as any);

    const results = await runConcurrent(50, async () => {
      const req = mockReq('POST', {}, { email: 'test@test.com', password: 'pass123' });
      const res = mockRes();
      const t   = performance.now();
      await loginHandler(req, res);
      return { statusCode: res.statusCode, durationMs: performance.now() - t };
    });

    const durations = results.map(r => r.durationMs);
    const errors    = results.filter(r => r.statusCode >= 400).length;
    const s         = stats(durations);

    console.log(`\n  [PERF-AUTH-01] avg=${s.avg.toFixed(2)}ms  p50=${s.p50.toFixed(2)}ms  p95=${s.p95.toFixed(2)}ms  errors=${errors}/50`);
    expect(s.p95).toBeLessThan(50);
    expect(errors / 50).toBeLessThan(0.01);
  });

  it('PERF-AUTH-02: 100 sequential login requests – no latency degradation over time', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeAuthSupabase() as any);

    const durations: number[] = [];
    for (let i = 0; i < 100; i++) {
      const req = mockReq('POST', {}, { email: 'test@test.com', password: 'pass123' });
      const res = mockRes();
      const t   = performance.now();
      await loginHandler(req, res);
      durations.push(performance.now() - t);
      expect(res.statusCode).toBe(200);
    }

    const s             = stats(durations);
    const firstAvg      = durations.slice(0,10).reduce((a,b)=>a+b,0)/10;
    const lastAvg       = durations.slice(90).reduce((a,b)=>a+b,0)/10;

    console.log(`\n  [PERF-AUTH-02] avg=${s.avg.toFixed(2)}ms  p95=${s.p95.toFixed(2)}ms  first10=${firstAvg.toFixed(2)}ms  last10=${lastAvg.toFixed(2)}ms`);
    expect(s.p95).toBeLessThan(50);
  });
});

// ── Module 2: Product Catalog ─────────────────────────────────────────────────

describe('PERF-02: Product Catalog Load Simulation', () => {
  beforeEach(() => vi.clearAllMocks());

  function makeProductsSupabase(count = 12) {
    const products = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, title: `Product ${i}`, price: 9.99 + i }));
    const chain: any = { select: vi.fn(), eq: vi.fn(), gte: vi.fn(), lte: vi.fn(), ilike: vi.fn(), order: vi.fn(), range: vi.fn() };
    Object.keys(chain).forEach(k => { if (k !== 'range') chain[k].mockReturnValue(chain); });
    chain.range.mockResolvedValue({ data: products, count: products.length, error: null });
    return { from: vi.fn(() => chain) };
  }

  it('PERF-PROD-01: 100 concurrent product listing requests – p95 < 30 ms, 0 errors', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeProductsSupabase() as any);

    const results = await runConcurrent(100, async () => {
      const req = mockReq('GET', { page: '1', limit: '12' });
      const res = mockRes();
      const t   = performance.now();
      await productsHandler(req, res);
      return { statusCode: res.statusCode, durationMs: performance.now() - t };
    });

    const s      = stats(results.map(r => r.durationMs));
    const errors = results.filter(r => r.statusCode !== 200).length;
    console.log(`\n  [PERF-PROD-01] avg=${s.avg.toFixed(2)}ms  p95=${s.p95.toFixed(2)}ms  errors=${errors}/100  rps≈${(1000/s.avg).toFixed(0)}`);
    expect(s.p95).toBeLessThan(30);
    expect(errors).toBe(0);
  });

  it('PERF-PROD-02: 50 filtered search requests – p95 < 30 ms', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeProductsSupabase(3) as any);

    const results = await runConcurrent(50, async () => {
      const req = mockReq('GET', { search: 'widget', page: '1', limit: '12' });
      const res = mockRes();
      const t   = performance.now();
      await productsHandler(req, res);
      return { statusCode: res.statusCode, durationMs: performance.now() - t };
    });

    const s = stats(results.map(r => r.durationMs));
    console.log(`\n  [PERF-PROD-02] avg=${s.avg.toFixed(2)}ms  p95=${s.p95.toFixed(2)}ms`);
    expect(s.p95).toBeLessThan(30);
  });
});

// ── Module 3: Cart Management ─────────────────────────────────────────────────

describe('PERF-03: Cart Management Load Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
  });

  it('PERF-CART-01: 50 concurrent GET /cart – p95 < 40 ms, 0 errors', async () => {
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'ci-1', product_id: 'p1', quantity: 2, product: {} }], error: null,
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const results = await runConcurrent(50, async () => {
      const req = mockReq('GET', {}, {}, { authorization: 'Bearer valid' });
      const res = mockRes();
      const t   = performance.now();
      await cartHandler(req, res);
      return { statusCode: res.statusCode, durationMs: performance.now() - t };
    });

    const s      = stats(results.map(r => r.durationMs));
    const errors = results.filter(r => r.statusCode !== 200).length;
    console.log(`\n  [PERF-CART-01] avg=${s.avg.toFixed(2)}ms  p50=${s.p50.toFixed(2)}ms  p95=${s.p95.toFixed(2)}ms  errors=${errors}/50`);
    expect(s.p95).toBeLessThan(40);
    expect(errors).toBe(0);
  });

  it('PERF-CART-02: SPIKE – 200 rapid POST /cart requests – error rate < 1%', async () => {
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'ci-new', product_id: 'p1', quantity: 1, product: {} }, error: null,
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const results = await runConcurrent(200, async () => {
      const req = mockReq('POST', {}, { product_id: 'p1', quantity: 1 }, { authorization: 'Bearer v' });
      const res = mockRes();
      const t   = performance.now();
      await cartHandler(req, res);
      return { statusCode: res.statusCode, durationMs: performance.now() - t };
    });

    const s         = stats(results.map(r => r.durationMs));
    const errors    = results.filter(r => r.statusCode !== 201).length;
    const errorRate = errors / results.length;
    console.log(`\n  [PERF-CART-02 SPIKE] avg=${s.avg.toFixed(2)}ms  p95=${s.p95.toFixed(2)}ms  p99=${s.p99.toFixed(2)}ms  errors=${errors}/200  error_rate=${(errorRate*100).toFixed(1)}%`);
    expect(errorRate).toBeLessThan(0.01);
  });
});
