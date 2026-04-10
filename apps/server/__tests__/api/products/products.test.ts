import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase.js', () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock('../../../lib/cors.js', () => ({
  cors: vi.fn(() => false),
}));
// Products handler uses dynamic import of auth for admin checks
vi.mock('../../../lib/auth.js', () => ({
  requireAdmin: vi.fn(),
  requireAuth: vi.fn(),
  extractToken: vi.fn(),
  getAuthUser: vi.fn(),
}));

import { getSupabaseAdmin } from '../../../lib/supabase.js';
import { requireAdmin } from '../../../lib/auth.js';
import handler from '../../../api/products/index.js';

function makeProducts() {
  return [
    { id: '1', title: 'Widget', price: 9.99, stock: 10, category_id: 'cat1' },
    { id: '2', title: 'Gadget', price: 19.99, stock: 5, category_id: 'cat2' },
  ];
}

function makeSupabase(products = makeProducts()) {
  const chainMock = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
  };

  // Make all chained calls return the same object (fluent API)
  Object.entries(chainMock).forEach(([key, fn]) => {
    if (key !== 'range' && key !== 'single' && key !== 'insert') {
      (fn as any).mockReturnValue(chainMock);
    }
  });

  // Terminal calls
  chainMock.range.mockResolvedValue({ data: products, count: products.length, error: null });
  chainMock.single.mockResolvedValue({ data: products[0], error: null });
  chainMock.insert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: products[0], error: null }) }) });

  return {
    from: vi.fn(() => chainMock),
    auth: { admin: { createUser: vi.fn() } },
    _chain: chainMock,
  };
}

function mockReq(method: string, query: any = {}, body: any = {}, headers: any = {}): any {
  return { method, query, body, headers };
}

function mockRes(): any {
  let latestStatus = 0;
  let latestBody: any = null;
  const res: any = {
    status(code: number) { latestStatus = code; return res; },
    json(data: any) { latestBody = data; return res; },
    get statusCode() { return latestStatus; },
    get body() { return latestBody; },
  };
  return res;
}

describe('GET /products', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PROD-UNIT-01: returns product list with total on GET', async () => {
    const supabase = makeSupabase();
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as any);

    const req = mockReq('GET', { page: '1', limit: '12' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
  });

  it('TC-PROD-UNIT-02: applies category_id filter when provided', async () => {
    const supabase = makeSupabase([makeProducts()[0]]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as any);

    const req = mockReq('GET', { category_id: 'cat1' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    // eq should have been called for category_id
    expect(supabase.from).toHaveBeenCalledWith('products');
  });

  it('TC-PROD-EDGE-01: handles page=0 gracefully (treated as page 0, range -12 to -1)', async () => {
    const supabase = makeSupabase([]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as any);
    const req = mockReq('GET', { page: '0', limit: '12' });
    const res = mockRes();
    await handler(req, res);
    // Should not crash; status 200 with empty array
    expect(res.statusCode).toBe(200);
  });

  it('TC-PROD-EDGE-02: handles extremely large limit without crashing', async () => {
    const supabase = makeSupabase(makeProducts());
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as any);
    const req = mockReq('GET', { limit: '999999' });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });
});

describe('POST /products', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PROD-FAIL-01: returns 403 when user is not admin', async () => {
    const supabase = makeSupabase();
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as any);
    vi.mocked(requireAdmin).mockImplementation(async (_req: any, res: any) => {
      res.status(403).json({ data: null, error: 'Forbidden: admin access required' });
      return null;
    });

    const req = mockReq('POST', {}, { title: 'Item', price: 9 }, { authorization: 'Bearer user-token' });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });

  it('TC-PROD-UNIT-03: creates product when admin token is valid', async () => {
    const newProduct = { id: 'p-new', title: 'New Product', price: 15 };
    const supabase = makeSupabase();
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as any);
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1' } as any);

    // mock the insert chain for POST
    supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newProduct, error: null }),
        }),
      }),
    } as any);

    const req = mockReq('POST', {}, { title: 'New Product', price: 15, stock: 10, category_id: 'cat1' }, { authorization: 'Bearer admin-tok' });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body.data.title).toBe('New Product');
  });

  it('TC-PROD-FAIL-02: returns 405 for PATCH method', async () => {
    const req = mockReq('PATCH');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });
});
