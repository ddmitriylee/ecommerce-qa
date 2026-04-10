import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase.js', () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock('../../../lib/cors.js', () => ({
  cors: vi.fn(() => false),
}));
vi.mock('../../../lib/auth.js', () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
}));

import { getSupabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth, requireAdmin } from '../../../lib/auth.js';
import handler from '../../../api/orders/index.js';
import orderItemHandler from '../../../api/orders/[id].js';

const MOCK_USER = { id: 'user-123', email: 'test@test.com' };

function mockReq(method: string, query: any = {}, body: any = {}): any {
  return { method, query, body, headers: { authorization: 'Bearer valid' } };
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
    {
      id: 'ci-1',
      user_id: MOCK_USER.id,
      product_id: 'p1',
      quantity: 2,
      product: { id: 'p1', title: 'Widget', price: 10, discount: 0, stock: 20 },
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /orders
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /orders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-ORD-UNIT-01: returns orders list for authenticated user', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const mockOrders = [{ id: 'o1', user_id: MOCK_USER.id, status: 'pending', total_price: 20 }];
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('TC-ORD-FAIL-01: returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockImplementation(async (_req: any, res: any) => {
      res.status(401).json({ data: null, error: 'Unauthorized' });
      return null;
    });

    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /orders (checkout)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /orders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-ORD-UNIT-02: creates order from cart and clears cart', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const cartItems = makeCartItems();
    const newOrder = { id: 'o-new', user_id: MOCK_USER.id, total_price: 20, status: 'pending' };

    let fromCall = 0;
    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCall++;
        if (table === 'cart_items' && fromCall === 1) {
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
        // order_items insert, product stock update, cart clear
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBe('o-new');
  });

  it('TC-ORD-EDGE-01: returns 400 when cart is empty', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/cart is empty/i);
  });

  it('TC-ORD-EDGE-02: correctly calculates discounted total price', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const discountedCartItems = [
      {
        id: 'ci-d',
        user_id: MOCK_USER.id,
        product_id: 'pd1',
        quantity: 1,
        product: { id: 'pd1', title: 'Sale Item', price: 100, discount: 20, stock: 5 }, // 20% off → $80
      },
    ];

    let fromCall = 0;
    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCall++;
        if (table === 'cart_items' && fromCall === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: discountedCartItems, error: null }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            insert: vi.fn().mockImplementation((data: any) => {
              // Capture total_price for assertion
              expect(data.total_price).toBe(80);
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { ...data, id: 'ord-d' }, error: null }),
                }),
              };
            }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('POST');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(201);
  });

  it('TC-ORD-FAIL-02: returns 405 for DELETE method', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as any);

    const req = mockReq('DELETE');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /orders/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /orders/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-ORD-UNIT-03: returns order by ID for owner', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const order = { id: 'o1', user_id: MOCK_USER.id, status: 'pending', items: [] };
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: order, error: null }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET', { id: 'o1' });
    const res = mockRes();
    await orderItemHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe('o1');
  });

  it('TC-ORD-FAIL-03: returns 404 for non-existent order', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET', { id: 'non-existent' });
    const res = mockRes();
    await orderItemHandler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('TC-ORD-FAIL-04: PUT /orders/:id status update requires admin', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(requireAdmin).mockImplementation(async (_req: any, res: any) => {
      res.status(403).json({ data: null, error: 'Forbidden: admin access required' });
      return null;
    });

    const req = mockReq('PUT', { id: 'o1' }, { status: 'shipped' });
    const res = mockRes();
    await orderItemHandler(req, res);

    expect(res.statusCode).toBe(403);
  });

  it('TC-ORD-EDGE-03: PUT /orders/:id with invalid status returns 400', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as any);

    const req = mockReq('PUT', { id: 'o1' }, { status: 'invalid-status' });
    const res = mockRes();
    await orderItemHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/status must be one of/i);
  });

  it('TC-ORD-UNIT-04: admin can update order status to shipped', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1' } as any);

    const updatedOrder = { id: 'o1', user_id: MOCK_USER.id, status: 'shipped' };
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedOrder, error: null }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('PUT', { id: 'o1' }, { status: 'shipped' });
    const res = mockRes();
    await orderItemHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('shipped');
  });

  it('TC-ORD-EDGE-04: PUT /orders/:id with missing status returns 400', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as any);

    const req = mockReq('PUT', { id: 'o1' }, {});
    const res = mockRes();
    await orderItemHandler(req, res);

    expect(res.statusCode).toBe(400);
  });

  it('TC-ORD-FAIL-05: returns 404 when updating status on non-existent order', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1' } as any);

    const supabase: any = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('PUT', { id: 'nonexistent' }, { status: 'delivered' });
    const res = mockRes();
    await orderItemHandler(req, res);

    expect(res.statusCode).toBe(404);
  });

  it('TC-ORD-FAIL-06: returns 405 for DELETE on /orders/:id', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as any);

    const req = mockReq('DELETE', { id: 'o1' });
    const res = mockRes();
    await orderItemHandler(req, res);

    expect(res.statusCode).toBe(405);
  });
});
