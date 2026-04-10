import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase.js', () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock('../../../lib/cors.js', () => ({
  cors: vi.fn(() => false),
}));

import { getSupabaseAdmin } from '../../../lib/supabase.js';
import handler from '../../../api/categories/index.js';

function mockReq(method: string): any {
  return { method, headers: {} };
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

describe('GET /categories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-CAT-UNIT-01: returns list of categories ordered by name', async () => {
    const mockCategories = [
      { id: 'c1', name: 'Accessories', created_at: '2024-01-01' },
      { id: 'c2', name: 'Electronics', created_at: '2024-01-02' },
      { id: 'c3', name: 'Shoes', created_at: '2024-01-03' },
    ];

    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].name).toBe('Accessories');
    expect(res.body.error).toBeNull();
  });

  it('TC-CAT-UNIT-02: returns empty array when no categories exist', async () => {
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('TC-CAT-FAIL-01: returns 500 when database error occurs', async () => {
    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB connection lost') }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });
});

describe('Non-GET /categories', () => {
  it('TC-CAT-FAIL-02: returns 405 for POST request', async () => {
    const req = mockReq('POST');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('TC-CAT-FAIL-03: returns 405 for DELETE request', async () => {
    const req = mockReq('DELETE');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('TC-CAT-FAIL-04: returns 405 for PUT request', async () => {
    const req = mockReq('PUT');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });
});
