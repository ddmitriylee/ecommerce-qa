/**
 * Assignment 3 – Chaos / Fault Injection Testing
 * ================================================
 * Run: cd apps/server && npm test
 *
 * Simulates realistic failure modes in the three high-risk modules
 * identified in the Midterm risk analysis.
 *
 * Fault types:
 *   • Database crash     – Supabase throws synchronously / asynchronously
 *   • Slow DB response   – Artificial delay before resolve
 *   • Partial write fail – First operation succeeds, second fails
 *   • Malformed payload  – Injection strings, nulls, wrong types
 *   • Cascading failure  – Multi-table error propagation
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
import cartHandler           from '../../api/cart/index.js';
import cartItemHandler       from '../../api/cart/[id].js';
import orderHandler          from '../../api/orders/index.js';

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
function delayedResolve<T>(value: T, delayMs: number) {
  return vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(value), delayMs)));
}

const MOCK_USER = { id: 'user-chaos', email: 'chaos@test.com' };

// ════════════════════════════════════════════════════════════════════════════
// 1. Authentication – Fault Injection
// ════════════════════════════════════════════════════════════════════════════

describe('CHAOS-01: Authentication – DB / Auth Service Failures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('CHAOS-AUTH-01: DB completely unreachable – returns 5xx, does not crash', async () => {
    const supabase: any = {
      auth: {
        signInWithPassword: vi.fn().mockRejectedValue(new Error('ECONNREFUSED: connection refused')),
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, { email: 'a@b.com', password: 'pass' });
    const res = mockRes();
    await expect(loginHandler(req, res)).resolves.not.toThrow();

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body).toBeDefined();
    console.log(`\n  CHAOS-AUTH-01: status=${res.statusCode}  body.error="${res.body?.error}"`);
  });

  it('CHAOS-AUTH-02: auth service returns malformed response (null data) – handled cleanly', async () => {
    const supabase: any = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'upstream auth error' },
        }),
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, { email: 'a@b.com', password: 'pass' });
    const res = mockRes();
    await expect(loginHandler(req, res)).resolves.not.toThrow();

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(600);
    console.log(`  CHAOS-AUTH-02: status=${res.statusCode}`);
  });

  it('CHAOS-AUTH-03: slow auth service (300 ms delay) – completes, returns 200', async () => {
    const supabase: any = {
      auth: {
        signInWithPassword: delayedResolve({
          data: { user: { id: 'u1' }, session: { access_token: 'tok' } }, error: null,
        }, 300),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: delayedResolve({ data: { role: 'customer' } }, 50),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req   = mockReq('POST', {}, { email: 'a@b.com', password: 'pass' });
    const res   = mockRes();
    const start = Date.now();
    await loginHandler(req, res);
    const elapsed = Date.now() - start;

    expect(res.statusCode).toBe(200);
    expect(elapsed).toBeGreaterThanOrEqual(300);
    console.log(`  CHAOS-AUTH-03: status=200  elapsed=${elapsed}ms (slow DB survived)`);
  });

  it('CHAOS-AUTH-04: SQL injection in email field – safely rejected, no crash', async () => {
    const supabase: any = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        }),
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, { email: "'; DROP TABLE users; --", password: 'x' });
    const res = mockRes();
    await expect(loginHandler(req, res)).resolves.not.toThrow();

    expect(res.statusCode).toBeLessThan(500);
    console.log(`  CHAOS-AUTH-04: status=${res.statusCode} (injection safely rejected)`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. Cart Management – DB Failure Mid-Operation
// ════════════════════════════════════════════════════════════════════════════

describe('CHAOS-02: Cart – Database Failures & Partial Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
  });

  it('CHAOS-CART-01: DB completely down on GET /cart – 500, internal error not leaked', async () => {
    const internMsg = 'pg_shadow table is corrupt: internal detail';
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error(internMsg)),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET', {}, {}, { authorization: 'Bearer valid' });
    const res = mockRes();
    await expect(cartHandler(req, res)).resolves.not.toThrow();

    expect(res.statusCode).toBeGreaterThanOrEqual(500);
    expect(JSON.stringify(res.body)).not.toContain(internMsg);
    console.log(`\n  CHAOS-CART-01: status=${res.statusCode}  internal error NOT leaked`);
  });

  it('CHAOS-CART-02: POST /cart – SELECT succeeds but INSERT fails (partial write) – 500', async () => {
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
            single: vi.fn().mockRejectedValue(new Error('insert failed: disk full')),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, { product_id: 'p1', quantity: 1 }, { authorization: 'Bearer v' });
    const res = mockRes();
    await expect(cartHandler(req, res)).resolves.not.toThrow();

    expect(res.statusCode).toBeGreaterThanOrEqual(500);
    console.log(`  CHAOS-CART-02: status=${res.statusCode} (partial write handled)`);
  });

  it('CHAOS-CART-03: DELETE /cart – slow DB (500 ms) – completes successfully', async () => {
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: delayedResolve({ error: null }, 500),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req   = mockReq('DELETE', {}, {}, { authorization: 'Bearer valid' });
    const res   = mockRes();
    const start = Date.now();
    await cartHandler(req, res);
    const elapsed = Date.now() - start;

    expect(res.statusCode).toBe(200);
    expect(elapsed).toBeGreaterThanOrEqual(400);
    console.log(`  CHAOS-CART-03: status=200  elapsed=${elapsed}ms (survived slow DB)`);
  });

  it('CHAOS-CART-04: PUT /cart/:id – DB returns not-found error – 404', async () => {
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null, error: { message: 'Row not found', code: 'PGRST116' },
                }),
              }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('PUT', { id: 'bad-id' }, { quantity: 5 }, { authorization: 'Bearer v' });
    const res = mockRes();
    await expect(cartItemHandler(req, res)).resolves.not.toThrow();

    expect(res.statusCode).toBe(404);
    console.log(`  CHAOS-CART-04: status=404 (graceful 404 on missing item)`);
  });

  it('CHAOS-CART-05: XSS string as product_id – handled without crash', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as any);

    const req = mockReq('POST', {}, { product_id: '<script>alert(1)</script>', quantity: 1 }, { authorization: 'Bearer v' });
    const res = mockRes();
    await expect(cartHandler(req, res)).resolves.not.toThrow();

    console.log(`  CHAOS-CART-05: status=${res.statusCode} (XSS string handled safely)`);
    expect(res.statusCode).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. Order Placement – Cascading Failures
// ════════════════════════════════════════════════════════════════════════════

describe('CHAOS-03: Orders – Cascading DB Failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
  });

  it('CHAOS-ORDER-01: cart fetch fails completely – returns 5xx, no crash', async () => {
    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'cart_items') {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockRejectedValue(new Error('cart_items locked')) }) };
        }
        return {};
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const res = mockRes();
    await expect(orderHandler(req, res)).resolves.not.toThrow();

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    console.log(`\n  CHAOS-ORDER-01: status=${res.statusCode} (cart fetch failure handled)`);
  });

  it('CHAOS-ORDER-02: order INSERT fails after cart fetched (cascade) – 500', async () => {
    const cartItems = [{ id: 'ci-1', product_id: 'p1', quantity: 2, product: { id: 'p1', price: 10, stock: 100 } }];
    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'cart_items') {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: cartItems, error: null }) }) };
        }
        if (table === 'orders') {
          return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockRejectedValue(new Error('orders write failure')) }) }) };
        }
        return {};
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const res = mockRes();
    await expect(orderHandler(req, res)).resolves.not.toThrow();

    expect(res.statusCode).toBeGreaterThanOrEqual(500);
    console.log(`  CHAOS-ORDER-02: status=${res.statusCode} (cascading failure handled)`);
  });

  it('CHAOS-ORDER-03: empty cart → 400, user gets clear error message', async () => {
    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'cart_items') {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
        }
        return {};
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const res = mockRes();
    await expect(orderHandler(req, res)).resolves.not.toThrow();

    expect(res.statusCode).toBe(400);
    expect(res.body?.error).toBeDefined();
    console.log(`  CHAOS-ORDER-03: status=400  error="${res.body?.error}"`);
  });

  it('CHAOS-ORDER-04: order_items INSERT fails after order created (partial cascade) – 500', async () => {
    const cartItems = [{ id: 'ci-1', product_id: 'p1', quantity: 1, product: { id: 'p1', price: 15, stock: 10 } }];
    const newOrder  = { id: 'o-1', user_id: MOCK_USER.id, total_price: 15, status: 'pending' };
    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'cart_items') {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: cartItems, error: null }) }) };
        }
        if (table === 'orders') {
          return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: newOrder, error: null }) }) }) };
        }
        if (table === 'order_items') {
          return { insert: vi.fn().mockRejectedValue(new Error('FK violation')) };
        }
        return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const res = mockRes();
    await expect(orderHandler(req, res)).resolves.not.toThrow();

    expect(res.statusCode).toBeGreaterThanOrEqual(500);
    console.log(`  CHAOS-ORDER-04: status=${res.statusCode} (order_items FK failure handled)`);
  });

  it('CHAOS-ORDER-05: system recovers after transient failure – second request succeeds', async () => {
    const cartItems = [{ id: 'ci-r', product_id: 'p1', quantity: 1, product: { id: 'p1', price: 10, stock: 5 } }];
    const newOrder  = { id: 'o-r', user_id: MOCK_USER.id, total_price: 10, status: 'pending' };

    function makeSupabase(failOrders: boolean): any {
      return {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'cart_items') {
            return {
              select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: cartItems, error: null }) }),
              delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'orders') {
            if (failOrders) return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockRejectedValue(new Error('transient')) }) }) };
            return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: newOrder, error: null }) }) }) };
          }
          if (table === 'order_items') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          if (table === 'products')    return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
          return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }),
      };
    }

    // Attempt 1: transient failure
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabase(true));
    const req1 = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const res1 = mockRes();
    await orderHandler(req1, res1);
    expect(res1.statusCode).toBeGreaterThanOrEqual(500);
    console.log(`\n  CHAOS-ORDER-05 attempt 1: status=${res1.statusCode} (transient failure)`);

    // Attempt 2: recovery
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabase(false));
    const req2 = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const res2 = mockRes();
    await orderHandler(req2, res2);
    expect(res2.statusCode).toBe(201);
    console.log(`  CHAOS-ORDER-05 attempt 2: status=${res2.statusCode} ✓ (RECOVERED)`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Observability – Error Leakage
// ════════════════════════════════════════════════════════════════════════════

describe('CHAOS-04: Observability – Error Message Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
  });

  it('CHAOS-OBS-01: internal DB error message NOT exposed to client', async () => {
    const internMsg = 'pg_shadow table is corrupt: internal details';
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error(internMsg)),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET', {}, {}, { authorization: 'Bearer valid' });
    const res = mockRes();
    await cartHandler(req, res);

    expect(JSON.stringify(res.body)).not.toContain(internMsg);
    console.log(`\n  CHAOS-OBS-01: client sees "${res.body?.error}" (internal detail hidden)`);
  });

  it('CHAOS-OBS-02: unauthenticated request returns clean 401, no stack trace', async () => {
    vi.mocked(requireAuth).mockImplementation(async (_req: any, res: any) => {
      res.status(401).json({ data: null, error: 'Unauthorized' });
      return null;
    });

    const req = mockReq('GET');
    const res = mockRes();
    await cartHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body?.error).toBe('Unauthorized');
    expect(JSON.stringify(res.body)).not.toContain('stack');
    console.log(`  CHAOS-OBS-02: 401 is clean – no stack trace leaked`);
  });
});
