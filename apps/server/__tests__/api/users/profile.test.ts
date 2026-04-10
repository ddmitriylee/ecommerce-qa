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
import handler from '../../../api/users/profile.js';

const MOCK_USER = { id: 'user-123', email: 'test@test.com' };

function mockReq(method: string, body: any = {}): any {
  return { method, body, headers: { authorization: 'Bearer valid' } };
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/profile
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /users/profile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PROF-UNIT-01: returns user profile with email for authenticated user', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const mockProfile = {
      id: 'prof-1',
      user_id: 'user-123',
      full_name: 'Test User',
      avatar_url: null,
      phone: '+1234567890',
      address: '123 Main St',
    };

    const supabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.full_name).toBe('Test User');
    expect(res.body.data.email).toBe('test@test.com');
    expect(res.body.error).toBeNull();
  });

  it('TC-PROF-FAIL-01: returns 404 when profile not found', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

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

    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('TC-PROF-FAIL-02: returns 401 when not authenticated', async () => {
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
// PUT /users/profile
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /users/profile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PROF-UNIT-02: updates profile fields successfully', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const updatedProfile = {
      id: 'prof-1',
      user_id: 'user-123',
      full_name: 'Updated Name',
      phone: '+9876543210',
      address: '456 New Ave',
      avatar_url: null,
      updated_at: '2024-01-15T10:00:00Z',
    };

    const supabase: any = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('PUT', { full_name: 'Updated Name', phone: '+9876543210', address: '456 New Ave' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.full_name).toBe('Updated Name');
    expect(res.body.data.phone).toBe('+9876543210');
  });

  it('TC-PROF-UNIT-03: updates only partial fields', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);

    const updatedProfile = {
      id: 'prof-1',
      full_name: 'Same Name',
      phone: '+1111111111',
    };

    const supabase: any = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    const req = mockReq('PUT', { phone: '+1111111111' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.phone).toBe('+1111111111');
  });

  it('TC-PROF-FAIL-03: returns 401 when not authenticated on PUT', async () => {
    vi.mocked(requireAuth).mockImplementation(async (_req: any, res: any) => {
      res.status(401).json({ data: null, error: 'Unauthorized' });
      return null;
    });

    const req = mockReq('PUT', { full_name: 'Hacker' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Method not allowed
// ─────────────────────────────────────────────────────────────────────────────

describe('Non-GET/PUT /users/profile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PROF-FAIL-04: returns 405 for DELETE request', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as any);

    const req = mockReq('DELETE');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(405);
  });

  it('TC-PROF-FAIL-05: returns 405 for PATCH request', async () => {
    vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as any);

    const req = mockReq('PATCH');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(405);
  });
});
