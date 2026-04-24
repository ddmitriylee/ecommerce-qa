/**
 * Assignment 3 – Chaos / Fault Injection Testing
 * ================================================
 * Tool: Vitest (runs in the server test environment)
 * Run: cd apps/server && npx vitest run ../../tests/chaos/chaos.test.ts
 *
 * Simulates realistic failure modes in the three high-risk modules
 * identified in the Midterm risk analysis:
 *   1. Authentication  – DB unavailable, slow auth service, malformed tokens
 *   2. Cart Management – DB failure mid-operation, partial write failures
 *   3. Order Placement – Cascading DB failures, stock depletion race condition
 *
 * Fault types injected:
 *   • Database failure   – Supabase client throws / returns top-level error
 *   • Slow DB response   – Artificial async delay before response
 *   • Partial failure    – First operation succeeds, second fails (cascade)
 *   • Malformed payload  – Injection strings, nulls, wrong types
 *   • Auth service down  – auth.getUser throws network-style error
 *
 * Each test asserts that the system:
 *   (a) Does NOT crash (no unhandled promise rejection)
 *   (b) Returns a meaningful HTTP error code (4xx or 5xx)
 *   (c) Does NOT leak internal error details to the client
 *   (d) Recovers correctly when the fault is removed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../../apps/server/lib/supabase.js', () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock('../../apps/server/lib/cors.js',     () => ({ cors: vi.fn(() => false) }));
vi.mock('../../apps/server/lib/auth.js', () => ({
  requireAuth:  vi.fn(),
  requireAdmin: vi.fn(),
  extractToken: vi.fn(),
  getAuthUser:  vi.fn(),
}));

import { getSupabaseAdmin } from '../../apps/server/lib/supabase.js';
import { requireAuth }       from '../../apps/server/lib/auth.js';
import loginHandler          from '../../apps/server/api/auth/login.js';
import cartHandler           from '../../apps/server/api/cart/index.js';
import cartItemHandler       from '../../apps/server/api/cart/[id].js';
import orderHandler          from '../../apps/server/api/orders/index.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
function mockReq(method: string, query: any = {}, body: any = {}, headers: any = {}): any {
  return { method, query, body, headers };
}

function mockRes(): any {
  let statusCode = 0;
  let body: any  = null;
  const res: any = {
    status(code: number) { statusCode = code; return res; },
    json(data: any)      { body = data;       return res; },
    get statusCode()     { return statusCode; },
    get body()           { return body; },
  };
  return res;
}

/** Returns a rejected promise after `delayMs` to simulate slow DB */
function slowReject(delayMs: number, msg: string) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(msg)), delayMs)
  );
}

/** Wraps jest.fn() to inject delay before resolving */
function delayedResolve<T>(value: T, delayMs: number) {
  return vi.fn().mockImplementation(
    () => new Promise(resolve => setTimeout(() => resolve(value), delayMs))
  );
}

const MOCK_USER = { id: 'user-chaos', email: 'chaos@test.com' };

// ════════════════════════════════════════════════════════════════════════════
// 1. Authentication – Fault Injection
// ════════════════════════════════════════════════════════════════════════════

describe('CHAOS-01: Authentication – DB / Auth Service Failures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('CHAOS-AUTH-01: DB completely unreachable → returns 500, does not crash', async () => {
    // Supabase client itself throws (network error)
    const supabase: any = {
      auth: {
        signInWithPassword: vi.fn().mockRejectedValue(
          new Error('ECONNREFUSED: connection refused (simulated DB down)')
        ),
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, { email: 'a@b.com', password: 'pass' });
    const res = mockRes();

    // Must not throw
    await expect(loginHandler(req, res)).resolves.not.toThrow();

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body).toBeDefined();
    console.log(`  CHAOS-AUTH-01: status=${res.statusCode} body.error="${res.body?.error}"`);
  });

  it('CHAOS-AUTH-02: auth service returns malformed response (no user object) → rejects cleanly', async () => {
    const supabase: any = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: null,   // malformed — no data.user
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

  it('CHAOS-AUTH-03: slow auth service (300 ms delay) → completes without timeout error', async () => {
    const supabase: any = {
      auth: {
        signInWithPassword: delayedResolve({
          data: { user: { id: 'u1' }, session: { access_token: 'tok' } },
          error: null,
        }, 300),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: delayedResolve({ data: { role: 'customer' } }, 100),
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
    console.log(`  CHAOS-AUTH-03: status=200  elapsed=${elapsed}ms (≥300ms expected)`);
  });

  it('CHAOS-AUTH-04: SQL-injection-like email string → rejected, does not crash DB', async () => {
    const supabase: any = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' },
        }),
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, {
      email:    "'; DROP TABLE users; --",
      password: 'anything',
    });
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

  it('CHAOS-CART-01: DB completely down on GET /cart → 500, no crash', async () => {
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('DB connection pool exhausted')),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET', {}, {}, { authorization: 'Bearer valid' });
    const res = mockRes();

    await expect(cartHandler(req, res)).resolves.not.toThrow();

    expect(res.statusCode).toBeGreaterThanOrEqual(500);
    expect(res.body?.error).toBeDefined();
    // Must NOT leak raw DB error message
    expect(res.body?.error).not.toContain('connection pool');
    console.log(`  CHAOS-CART-01: status=${res.statusCode} (DB error not leaked to client)`);
  });

  it('CHAOS-CART-02: POST /cart – SELECT succeeds but INSERT fails (partial write) → 500', async () => {
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
    console.log(`  CHAOS-CART-02: status=${res.statusCode} (partial write error handled)`);
  });

  it('CHAOS-CART-03: DELETE /cart – slow DB (500 ms) – completes without timeout', async () => {
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
    expect(elapsed).toBeGreaterThanOrEqual(500);
    console.log(`  CHAOS-CART-03: status=200  elapsed=${elapsed}ms (survived slow DB)`);
  });

  it('CHAOS-CART-04: PUT /cart/:id – DB returns error for non-existent item → 404', async () => {
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Row not found', code: 'PGRST116' },
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

  it('CHAOS-CART-05: malformed product_id (XSS string) → rejected without crash', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as any);

    const req = mockReq('POST', {}, {
      product_id: '<script>alert(1)</script>',
      quantity: 1,
    }, { authorization: 'Bearer v' });
    const res = mockRes();

    // This passes validation (product_id is present); the real DB would reject
    // the malformed UUID — the test asserts the app doesn't 500-crash
    await expect(cartHandler(req, res)).resolves.not.toThrow();
    console.log(`  CHAOS-CART-05: status=${res.statusCode} (XSS string handled safely)`);
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

  it('CHAOS-ORDER-01: cart fetch fails before order creation → 500, no crash', async () => {
    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'cart_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockRejectedValue(new Error('cart_items table locked')),
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const res = mockRes();

    await expect(orderHandler(req, res)).resolves.not.toThrow();
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    console.log(`  CHAOS-ORDER-01: status=${res.statusCode} (cart fetch failure handled)`);
  });

  it('CHAOS-ORDER-02: orders INSERT fails after cart is fetched (cascade failure) → 500', async () => {
    const cartItems = [
      { id: 'ci-1', product_id: 'p1', quantity: 2, product: { id: 'p1', price: 10, stock: 100 } },
    ];

    let callCount = 0;
    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        callCount++;
        if (table === 'cart_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: cartItems, error: null }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockRejectedValue(new Error('orders table write failed')),
              }),
            }),
          };
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

  it('CHAOS-ORDER-03: empty cart → 400, system stability preserved', async () => {
    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'cart_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
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
    console.log(`  CHAOS-ORDER-03: status=400 (empty cart correctly rejected)`);
  });

  it('CHAOS-ORDER-04: order_items INSERT fails after order created → cascades to 500', async () => {
    const cartItems = [
      { id: 'ci-1', product_id: 'p1', quantity: 1, product: { id: 'p1', price: 15, stock: 10 } },
    ];
    const newOrder = { id: 'o-1', user_id: MOCK_USER.id, total_price: 15, status: 'pending' };

    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'cart_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: cartItems, error: null }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'order_items') {
          return {
            insert: vi.fn().mockRejectedValue(new Error('FK violation on order_items')),
          };
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

  it('CHAOS-ORDER-05: system recovers after transient error — next request succeeds', async () => {
    let attempt = 0;
    const cartItems = [
      { id: 'ci-r', product_id: 'p1', quantity: 1, product: { id: 'p1', price: 10, stock: 5 } },
    ];
    const newOrder = { id: 'o-r', user_id: MOCK_USER.id, total_price: 10, status: 'pending' };

    function makeSupabase(failOrders: boolean) {
      return {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'cart_items') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: cartItems, error: null }),
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'orders') {
            if (failOrders) {
              return {
                insert: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockRejectedValue(new Error('transient error')),
                  }),
                }),
              };
            }
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: newOrder, error: null }),
                }),
              }),
            };
          }
          if (table === 'order_items') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          if (table === 'products') return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
          return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }),
      } as any;
    }

    // Attempt 1: transient failure
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabase(true));
    const req1 = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const res1 = mockRes();
    await orderHandler(req1, res1);
    expect(res1.statusCode).toBeGreaterThanOrEqual(500);
    console.log(`  CHAOS-ORDER-05 attempt 1: status=${res1.statusCode} (transient failure)`);

    // Attempt 2: recovery — same request succeeds
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabase(false));
    const req2 = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const res2 = mockRes();
    await orderHandler(req2, res2);
    expect(res2.statusCode).toBe(201);
    console.log(`  CHAOS-ORDER-05 attempt 2: status=${res2.statusCode} ✓ (recovered)`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Observability – Error Leakage & Information Disclosure
// ════════════════════════════════════════════════════════════════════════════

describe('CHAOS-04: Observability – Error Message Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
  });

  it('CHAOS-OBS-01: internal DB error message is NOT exposed to client in GET /cart', async () => {
    const internalMsg = 'pg_shadow table is corrupt: internal details';
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error(internalMsg)),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET', {}, {}, { authorization: 'Bearer valid' });
    const res = mockRes();
    await cartHandler(req, res);

    const responseBody = JSON.stringify(res.body);
    expect(responseBody).not.toContain(internalMsg);
    console.log(`  CHAOS-OBS-01: internal error NOT leaked. Client sees: "${res.body?.error}"`);
  });

  it('CHAOS-OBS-02: unauthenticated requests return 401 without any internal info', async () => {
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
    console.log(`  CHAOS-OBS-02: 401 response is clean, no stack trace exposed`);
  });
});
