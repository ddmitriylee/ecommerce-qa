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
import handler from '../../../api/admin/stats.js';

function mockReq(method: string): any {
  return { method, headers: { authorization: 'Bearer admin-token' } };
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

describe('GET /admin/stats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-ADMIN-UNIT-01: returns stats for admin user', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1' } as any);

    const deliveredOrders = [
      { total_price: 50.00 },
      { total_price: 75.50 },
      { total_price: 24.50 },
    ];
    const recentOrders = [
      { id: 'o1', status: 'pending', created_at: '2024-01-01', profile: { full_name: 'User A' } },
    ];

    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockResolvedValue({ count: 42, error: null }),
          };
        }
        if (table === 'orders') {
          // Called twice: once for count, once for revenue, once for recent
          return {
            select: vi.fn().mockImplementation((sel: string) => {
              if (sel.includes('count')) {
                return { count: 15, error: null };
              }
              if (sel === 'total_price') {
                return {
                  eq: vi.fn().mockResolvedValue({ data: deliveredOrders, error: null }),
                };
              }
              // recent orders
              return {
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: recentOrders, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockResolvedValue({ count: 100, error: null }),
          };
        }
        return {};
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalProducts).toBe(42);
    expect(res.body.data.totalRevenue).toBe(150);
    expect(res.body.data.recentOrders).toHaveLength(1);
    expect(res.body.error).toBeNull();
  });

  it('TC-ADMIN-FAIL-01: returns 403 when user is not admin', async () => {
    vi.mocked(requireAdmin).mockImplementation(async (_req: any, res: any) => {
      res.status(403).json({ data: null, error: 'Forbidden: admin access required' });
      return null;
    });

    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/forbidden/i);
  });

  it('TC-ADMIN-FAIL-02: returns 401 when no auth token', async () => {
    vi.mocked(requireAdmin).mockImplementation(async (_req: any, res: any) => {
      res.status(401).json({ data: null, error: 'Unauthorized' });
      return null;
    });

    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(401);
  });

  it('TC-ADMIN-UNIT-02: returns 0 revenue when no delivered orders', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1' } as any);

    const supabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return { select: vi.fn().mockResolvedValue({ count: 0, error: null }) };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockImplementation((sel: string) => {
              if (sel.includes('count')) return { count: 0, error: null };
              if (sel === 'total_price') {
                return { eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
              }
              return {
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'profiles') {
          return { select: vi.fn().mockResolvedValue({ count: 0, error: null }) };
        }
        return {};
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalRevenue).toBe(0);
    expect(res.body.data.totalOrders).toBe(0);
  });
});

describe('Non-GET /admin/stats', () => {
  it('TC-ADMIN-FAIL-03: returns 405 for POST request', async () => {
    const req = mockReq('POST');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('TC-ADMIN-FAIL-04: returns 405 for DELETE request', async () => {
    const req = mockReq('DELETE');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });
});
