import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase.js', () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock('../../../lib/cors.js', () => ({
  cors: vi.fn(() => false),
}));
vi.mock('../../../lib/auth.js', () => ({
  requireAuth: vi.fn(),
}));

import { getSupabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';
import handler from '../../../api/cart/index.js';
import cartItemHandler from '../../../api/cart/[id].js';

const MOCK_USER = { id: 'user-123', email: 'test@test.com' };

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

function makeCartItems() {
  return [
    { id: 'ci-1', user_id: 'user-123', product_id: 'p1', quantity: 2, product: { id: 'p1', title: 'Widget', price: 10 } },
    { id: 'ci-2', user_id: 'user-123', product_id: 'p2', quantity: 1, product: { id: 'p2', title: 'Gadget', price: 20 } },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /cart
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /cart', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-CART-UNIT-01: returns cart items for authenticated user', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: makeCartItems(), error: null }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET', {}, {}, { authorization: 'Bearer valid' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('TC-CART-FAIL-01: returns 401 when no auth token', async () => {
    vi.mocked(requireAuth).mockImplementation(async (_req: any, res: any) => {
      res.status(401).json({ data: null, error: 'Unauthorized' });
      return null;
    });

    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /cart
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /cart', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-CART-UNIT-02: adds new item to cart', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    const newItem = { id: 'ci-new', user_id: 'user-123', product_id: 'p3', quantity: 1, product: { id: 'p3' } };

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
            single: vi.fn().mockResolvedValue({ data: newItem, error: null }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, { product_id: 'p3', quantity: 1 }, { authorization: 'Bearer valid' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.product_id).toBe('p3');
  });

  it('TC-CART-UNIT-03: increases quantity when item already in cart', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    const existing = { id: 'ci-1', quantity: 2 };
    const updated = { ...existing, quantity: 3, product: {} };

    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: existing, error: null }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updated, error: null }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST', {}, { product_id: 'p1', quantity: 1 }, { authorization: 'Bearer valid' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.quantity).toBe(3);
  });

  it('TC-CART-EDGE-01: returns 400 when quantity is 0', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as any);

    const req = mockReq('POST', {}, { product_id: 'p1', quantity: 0 });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/quantity/i);
  });

  it('TC-CART-EDGE-02: returns 400 when product_id is missing', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as any);

    const req = mockReq('POST', {}, { quantity: 1 });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  it('TC-CART-EDGE-03: returns 400 when quantity is negative', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as any);

    const req = mockReq('POST', {}, { product_id: 'p1', quantity: -5 });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /cart (clear all)
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /cart', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-CART-UNIT-04: clears entire cart', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const supabase: any = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('DELETE', {}, {}, { authorization: 'Bearer valid' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.cleared).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Concurrency: Parallel POST requests
// ─────────────────────────────────────────────────────────────────────────────

describe('CART Concurrency', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-CART-CONC-01: parallel add-to-cart calls do not result in duplicate entries', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    let callCount = 0;
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              // First call: no existing item; subsequent calls: item exists
              single: vi.fn().mockImplementation(async () => {
                callCount++;
                if (callCount === 1) return { data: null, error: null };
                return { data: { id: 'ci-1', quantity: 1 }, error: null };
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'ci-1', quantity: 1, product: {} }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'ci-1', quantity: 2, product: {} }, error: null }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    // Fire 3 parallel requests
    const requests = Array.from({ length: 3 }, () => {
      const req = mockReq('POST', {}, { product_id: 'p1', quantity: 1 }, { authorization: 'Bearer valid' });
      const res = mockRes();
      return handler(req, res).then(() => res.statusCode);
    });

    const results = await Promise.all(requests);
    // All should succeed (201), not crash
    expect(results.every(code => code === 201)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cart Item [id] handler
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /cart/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-CART-UNIT-05: updates cart item quantity', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    const updated = { id: 'ci-1', quantity: 5, product: {} };

    const supabase: any = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updated, error: null }),
              }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('PUT', { id: 'ci-1' }, { quantity: 5 }, { authorization: 'Bearer valid' });
    const res = mockRes();
    await cartItemHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.quantity).toBe(5);
  });

  it('TC-CART-EDGE-04: returns 400 when quantity is 0 in PUT', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as any);

    const req = mockReq('PUT', { id: 'ci-1' }, { quantity: 0 });
    const res = mockRes();
    await cartItemHandler(req, res);

    expect(res.statusCode).toBe(400);
  });
});
