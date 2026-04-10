import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractToken, getAuthUser, requireAuth, requireAdmin } from '../../lib/auth.js';

// ─────────────────────────────────────────────────────────────────────────────
// Supabase mock — hoisted so imports resolve correctly
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../../lib/supabase.js', () => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }));
  const mockFrom = vi.fn(() => ({ select: mockSelect.mockReturnValue({ eq: mockEq }) }));

  const mockGetUser = vi.fn();

  return {
    getSupabaseAdmin: vi.fn(() => ({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })),
    __mockGetUser: mockGetUser,
    __mockFrom: mockFrom,
    __mockSelect: mockSelect,
    __mockEq: mockEq,
  };
});

function mockReq(headers: Record<string, string> = {}): any {
  return { headers };
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

// ─────────────────────────────────────────────────────────────────────────────
// extractToken
// ─────────────────────────────────────────────────────────────────────────────

describe('extractToken', () => {
  it('TC-AUTH-UNIT-01: returns token from valid Bearer header', () => {
    const req = mockReq({ authorization: 'Bearer my-secret-token' });
    expect(extractToken(req)).toBe('my-secret-token');
  });

  it('TC-AUTH-UNIT-02: returns null when Authorization header is missing', () => {
    const req = mockReq({});
    expect(extractToken(req)).toBeNull();
  });

  it('TC-AUTH-UNIT-03: returns null when header is malformed (no Bearer prefix)', () => {
    const req = mockReq({ authorization: 'Token abc123' });
    expect(extractToken(req)).toBeNull();
  });

  it('TC-AUTH-EDGE-01: returns empty string for "Bearer " with no token', () => {
    const req = mockReq({ authorization: 'Bearer ' });
    // Slice(7) of "Bearer " gives ""
    expect(extractToken(req)).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAuthUser
// ─────────────────────────────────────────────────────────────────────────────

describe('getAuthUser', () => {
  it('TC-AUTH-UNIT-04: returns null when no token present', async () => {
    const req = mockReq({});
    const result = await getAuthUser(req);
    expect(result).toBeNull();
  });

  it('TC-AUTH-UNIT-05: returns user when token is valid', async () => {
    const { getSupabaseAdmin } = await import('../../lib/supabase.js');
    const supabase = getSupabaseAdmin() as any;
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    const req = mockReq({ authorization: 'Bearer valid-token' });
    const result = await getAuthUser(req);
    expect(result).toMatchObject({ id: 'user-1' });
  });

  it('TC-AUTH-FAIL-01: returns null when Supabase auth returns error', async () => {
    const { getSupabaseAdmin } = await import('../../lib/supabase.js');
    const supabase = getSupabaseAdmin() as any;
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('invalid JWT'),
    });

    const req = mockReq({ authorization: 'Bearer bad-token' });
    const result = await getAuthUser(req);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireAuth
// ─────────────────────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  it('TC-AUTH-FAIL-02: sends 401 when no token', async () => {
    const { getSupabaseAdmin } = await import('../../lib/supabase.js');
    const supabase = getSupabaseAdmin() as any;
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('no token') });

    const req = mockReq({});
    const res = mockRes();
    const result = await requireAuth(req, res);
    expect(result).toBeNull();
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('TC-AUTH-UNIT-06: returns user when authenticated', async () => {
    const { getSupabaseAdmin } = await import('../../lib/supabase.js');
    const supabase = getSupabaseAdmin() as any;
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } },
      error: null,
    });

    const req = mockReq({ authorization: 'Bearer valid' });
    const res = mockRes();
    const result = await requireAuth(req, res);
    expect(result).toMatchObject({ id: 'u1' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireAdmin
// ─────────────────────────────────────────────────────────────────────────────

describe('requireAdmin', () => {
  it('TC-AUTH-FAIL-03: sends 403 when user is not admin', async () => {
    const { getSupabaseAdmin } = await import('../../lib/supabase.js');
    const supabase = getSupabaseAdmin() as any;
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'user@b.com' } },
      error: null,
    });
    // from().select().eq().single() → role: 'customer'
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { role: 'customer' }, error: null }),
        }),
      }),
    });

    const req = mockReq({ authorization: 'Bearer user-token' });
    const res = mockRes();
    const result = await requireAdmin(req, res);
    expect(result).toBeNull();
    expect(res.statusCode).toBe(403);
  });

  it('TC-AUTH-UNIT-07: returns user when role is admin', async () => {
    const { getSupabaseAdmin } = await import('../../lib/supabase.js');
    const supabase = getSupabaseAdmin() as any;
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@b.com' } },
      error: null,
    });
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
        }),
      }),
    });

    const req = mockReq({ authorization: 'Bearer admin-token' });
    const res = mockRes();
    const result = await requireAdmin(req, res);
    expect(result).toMatchObject({ id: 'admin-1' });
  });
});
