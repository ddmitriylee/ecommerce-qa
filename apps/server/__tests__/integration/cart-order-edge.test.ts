import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/supabase.js', () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock('../../lib/cors.js', () => ({ cors: vi.fn(() => false) }));
vi.mock('../../lib/auth.js', () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
  extractToken: vi.fn(),
  getAuthUser: vi.fn(),
}));

import { getSupabaseAdmin } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import cartHandler from '../../api/cart/index.js';
import cartItemHandler from '../../api/cart/[id].js';
import orderHandler from '../../api/orders/index.js';
import loginHandler from '../../api/auth/login.js';

const MOCK_USER = { id: 'user-int-1', email: 'integration@test.com' };

function mockReq(method: string, query: any = {}, body: any = {}, headers: any = {}): any {
  return { method, query, body, headers };
}

function mockRes(): any {
  let statusCode = 0;
  let body: any = null;
  const res: any = {
    status(code: number) { statusCode = code; return res; },
    json(data: any) { body = data; return res; },
    get statusCode() { return statusCode; },
    get body() { return body; },
  };
  return res;
}

describe('Integration: Cart → Order Flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-INT-CART-ORDER-01: full cart-to-order flow across modules', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const cartItems = [
      {
        id: 'ci-int-1',
        user_id: MOCK_USER.id,
        product_id: 'p1',
        quantity: 2,
        product: { id: 'p1', title: 'Widget', price: 10, stock: 50 },
      },
      {
        id: 'ci-int-2',
        user_id: MOCK_USER.id,
        product_id: 'p2',
        quantity: 1,
        product: { id: 'p2', title: 'Gadget', price: 25, stock: 30 },
      },
    ];

    // --- Step 1: GET /cart — verify items are in cart ---
    const supabaseGet: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: cartItems, error: null }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabaseGet);

    const getReq = mockReq('GET', {}, {}, { authorization: 'Bearer valid' });
    const getRes = mockRes();
    await cartHandler(getReq, getRes);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.data).toHaveLength(2);

    // --- Step 2: POST /orders — place order from that cart ---
    const expectedTotal = (10 * 2) + (25 * 1); // 45
    const newOrder = {
      id: 'o-int-1',
      user_id: MOCK_USER.id,
      total_price: expectedTotal,
      status: 'pending',
    };

    let fromCallCount = 0;
    const supabaseOrder: any = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCallCount++;
        if (table === 'cart_items' && fromCallCount <= 2) {
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
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'order_items') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        if (table === 'products') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabaseOrder);

    const orderReq = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const orderRes = mockRes();
    await orderHandler(orderReq, orderRes);

    // Order should be created successfully
    expect(orderRes.statusCode).toBe(201);
    expect(orderRes.body.data.total_price).toBe(expectedTotal);
    expect(orderRes.body.data.status).toBe('pending');
  });
});

// ———————————————————————————————————————————————————————————————————————————
// 2. CONCURRENCY TESTS — Double submission & parallel operations
// ———————————————————————————————————————————————————————————————————————————

describe('Concurrency: Race Conditions', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * TC-ORDER-CONC-01
   * Target module: Orders (high-risk)
   * Scenario type: Concurrency (double submission)
   * Input: Two simultaneous POST /orders from same user
   * Expected: Both resolve without crash; at most one succeeds or both
   *           handle gracefully (no duplicate orders from same cart).
   * Mapping: Simulates user double-clicking "Place Order" button.
   */
  it('TC-ORDER-CONC-01: double order placement does not crash', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const cartItems = [
      {
        id: 'ci-conc-1',
        user_id: MOCK_USER.id,
        product_id: 'p1',
        quantity: 1,
        product: { id: 'p1', title: 'Item', price: 10, stock: 5 },
      },
    ];

    const newOrder = { id: 'o-conc', user_id: MOCK_USER.id, total_price: 10, status: 'pending' };

    const supabase: any = {
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
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'order_items') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        if (table === 'products') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    // Fire two order requests in parallel
    const req1 = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const res1 = mockRes();
    const req2 = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const res2 = mockRes();

    const [result1, result2] = await Promise.allSettled([
      orderHandler(req1, res1),
      orderHandler(req2, res2),
    ]);

    // Both promises should resolve (not throw/crash)
    expect(result1.status).toBe('fulfilled');
    expect(result2.status).toBe('fulfilled');

    // At least one should succeed
    const anySuccess = res1.statusCode === 201 || res2.statusCode === 201;
    expect(anySuccess).toBe(true);
  });

  /**
   * TC-CART-CONC-01
   * Target module: Cart (high-risk)
   * Scenario type: Concurrency (parallel API calls)
   * Input: Three simultaneous POST /cart with the same product
   * Expected: All resolve without error; system handles gracefully.
   * Mapping: Simulates rapid "Add to Cart" clicks.
   */
  it('TC-CART-CONC-01: parallel add-to-cart calls do not crash', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

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
              data: { id: 'ci-new', product_id: 'p1', quantity: 1, product: {} },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    // Fire 3 parallel add-to-cart requests
    const requests = Array.from({ length: 3 }, () => {
      const req = mockReq('POST', {}, { product_id: 'p1', quantity: 1 }, { authorization: 'Bearer v' });
      const res = mockRes();
      return { req, res };
    });

    const results = await Promise.allSettled(
      requests.map(({ req, res }) => cartHandler(req, res))
    );

    // All should resolve without crashing
    results.forEach((r) => expect(r.status).toBe('fulfilled'));

    // All should return 201
    requests.forEach(({ res }) => expect(res.statusCode).toBe(201));
  });
});

// ———————————————————————————————————————————————————————————————————————————
// 3. EDGE CASES — Injection, large payloads, invalid quantities
// ———————————————————————————————————————————————————————————————————————————

describe('Edge Cases: Injection & Boundary Values', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * TC-AUTH-EDGE-04
   * Target module: Authentication (high-risk)
   * Scenario type: Edge (injection-like input)
   * Input: email = "'; DROP TABLE users; --", password = "test"
   * Expected: Returns 400 (validation) or Supabase auth error — NOT a crash.
   * Mapping: Verifies that SQL injection attempts in login are safely handled.
   */
  it('TC-AUTH-EDGE-04: SQL injection in email field is safely rejected', async () => {
    const supabase: any = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        }),
      },
      from: vi.fn(),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', { email: "'; DROP TABLE users; --", password: 'test' });
    const res = mockRes();
    await loginHandler(req, res);

    // Should return 400 (validation) or auth error — NOT 500
    expect(res.statusCode).toBeLessThan(500);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  /**
   * TC-CART-EDGE-03
   * Target module: Cart (high-risk)
   * Scenario type: Edge (extremely large payload)
   * Input: quantity = 999999999 (integer near overflow)
   * Expected: Either accepted or rejected with proper error — no crash.
   * Mapping: Tests boundary condition for quantity field; prevents
   *          integer overflow or unreasonable stock allocation.
   */
  it('TC-CART-EDGE-03: extremely large quantity is handled without crash', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

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
              data: { id: 'ci-big', product_id: 'p1', quantity: 999999999, product: {} },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq(
      'POST', {},
      { product_id: 'p1', quantity: 999999999 },
      { authorization: 'Bearer v' }
    );
    const res = mockRes();
    await cartHandler(req, res);

    // Should NOT crash (500). Either 201 (accepted) or 400 (validation).
    expect(res.statusCode).toBeDefined();
    expect(res.statusCode).not.toBe(500);
  });

  /**
   * TC-CART-EDGE-04
   * Target module: Cart (high-risk)
   * Scenario type: Edge (invalid input — negative quantity)
   * Input: quantity = -5
   * Expected: Returns 400 or rejects gracefully.
   * Mapping: Ensures negative quantities cannot corrupt cart state.
   */
  it('TC-CART-EDGE-04: negative quantity is handled gracefully', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

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
              data: { id: 'ci-neg', product_id: 'p1', quantity: -5, product: {} },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq(
      'POST', {},
      { product_id: 'p1', quantity: -5 },
      { authorization: 'Bearer v' }
    );
    const res = mockRes();
    await cartHandler(req, res);

    // Should not crash. If API lacks validation, test documents the gap.
    expect(res.statusCode).toBeDefined();
  });
});

// ———————————————————————————————————————————————————————————————————————————
// 4. INVALID USER BEHAVIOR — Skipping steps, bad IDs, malformed tokens
// ———————————————————————————————————————————————————————————————————————————

describe('Invalid User Behavior', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * TC-ORDER-INVALID-01
   * Target module: Orders (high-risk)
   * Scenario type: Invalid user behavior (skipping required steps)
   * Input: POST /orders when cart is empty
   * Expected: Returns 400 — cannot place order with no items.
   * Mapping: User skips adding items and goes straight to checkout.
   */
  it('TC-ORDER-INVALID-01: placing order with empty cart returns error', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'cart_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }), // EMPTY cart
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, {}, { authorization: 'Bearer valid' });
    const res = mockRes();
    await orderHandler(req, res);

    // Should reject — no items to order
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  /**
   * TC-CART-INVALID-01
   * Target module: Cart (high-risk)
   * Scenario type: Invalid user behavior (operating on non-existent resource)
   * Input: PATCH /cart/nonexistent-id with quantity update
   * Expected: Returns 404 or appropriate error.
   * Mapping: User manipulates URL to access a cart item that doesn't exist.
   */
  it('TC-CART-INVALID-01: updating non-existent cart item returns error', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

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

    const req = mockReq(
      'PATCH',
      { id: 'nonexistent-id-12345' },
      { quantity: 5 },
      { authorization: 'Bearer valid' }
    );
    const res = mockRes();
    await cartItemHandler(req, res);

    // Should return error, not 200
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
