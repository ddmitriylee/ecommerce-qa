import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase.js', () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock('../../../lib/cors.js', () => ({
  cors: vi.fn(() => false),
}));
vi.mock('../../../lib/auth.js', () => ({
  requireAdmin: vi.fn(),
  requireAuth: vi.fn(),
}));

import { getSupabaseAdmin } from '../../../lib/supabase.js';
import { requireAdmin } from '../../../lib/auth.js';
import handler from '../../../api/products/[id].js';

function mockReq(method: string, query: any = {}, body: any = {}): any {
  return { method, query, body, headers: { authorization: 'Bearer token' } };
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

const MOCK_PRODUCT = {
  id: 'prod-1',
  title: 'Widget',
  description: 'A nice widget',
  price: 29.99,
  discount: 10,
  stock: 50,
  category_id: 'cat-1',
  image_url: null,
  category: { id: 'cat-1', name: 'Electronics' },
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /products/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /products/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PROD-ID-UNIT-01: returns product by ID on success', async () => {
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: MOCK_PRODUCT, error: null }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET', { id: 'prod-1' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe('prod-1');
    expect(res.body.data.title).toBe('Widget');
    expect(res.body.error).toBeNull();
  });

  it('TC-PROD-ID-FAIL-01: returns 404 when product does not exist', async () => {
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET', { id: 'nonexistent' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /products/:id (admin)
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /products/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PROD-ID-UNIT-02: admin can update product', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1' } as any);
    const updated = { ...MOCK_PRODUCT, title: 'Updated Widget' };

    const supabase: any = {
      from: vi.fn().mockReturnValue({
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

    const req = mockReq('PUT', { id: 'prod-1' }, { title: 'Updated Widget' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Updated Widget');
  });

  it('TC-PROD-ID-FAIL-02: returns 403 when non-admin tries to update', async () => {
    vi.mocked(requireAdmin).mockImplementation(async (_req: any, res: any) => {
      res.status(403).json({ data: null, error: 'Forbidden: admin access required' });
      return null;
    });

    const req = mockReq('PUT', { id: 'prod-1' }, { title: 'Hacked' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(403);
  });

  it('TC-PROD-ID-FAIL-03: returns 404 when updating non-existent product', async () => {
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

    const req = mockReq('PUT', { id: 'nonexistent' }, { title: 'X' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /products/:id (admin)
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /products/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PROD-ID-UNIT-03: admin can delete product', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1' } as any);

    const supabase: any = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('DELETE', { id: 'prod-1' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });

  it('TC-PROD-ID-FAIL-04: returns 403 when non-admin tries to delete', async () => {
    vi.mocked(requireAdmin).mockImplementation(async (_req: any, res: any) => {
      res.status(403).json({ data: null, error: 'Forbidden: admin access required' });
      return null;
    });

    const req = mockReq('DELETE', { id: 'prod-1' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Method not allowed
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /products/:id', () => {
  it('TC-PROD-ID-FAIL-05: returns 405 for unsupported method', async () => {
    const req = mockReq('PATCH', { id: 'prod-1' });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });
});
