import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Shared mock factories
// ─────────────────────────────────────────────────────────────────────────────

function makeSupabaseMock(overrides: Record<string, any> = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn(),
      ...overrides.auth,
    },
    from: vi.fn(),
    ...overrides,
  };
}

function mockReq(method: string, body: any = {}): any {
  return { method, body, headers: {} };
}

function mockRes(): any {
  const calls: { status: number; body: any }[] = [];
  let latestStatus = 0;
  let latestBody: any = null;
  const res: any = {
    status(code: number) { latestStatus = code; return res; },
    json(data: any) { latestBody = data; calls.push({ status: latestStatus, body: data }); return res; },
    get statusCode() { return latestStatus; },
    get body() { return latestBody; },
  };
  return res;
}

vi.mock('../../../lib/supabase.js', () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock('../../../lib/cors.js', () => ({
  cors: vi.fn(() => false),
}));

import { getSupabaseAdmin } from '../../../lib/supabase.js';
import handler from '../../../api/auth/login.js';

// ─────────────────────────────────────────────────────────────────────────────
// Login Handler Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-AUTH-UNIT-08: returns 200 with user and session on valid credentials', async () => {
    const mockUser = { id: 'u1', email: 'test@test.com' };
    const mockSession = { access_token: 'tok', refresh_token: 'ref' };
    const mockProfile = { full_name: 'Test User', role: 'customer' };

    const supabase = makeSupabaseMock();
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile }),
        }),
      }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as any);

    const req = mockReq('POST', { email: 'test@test.com', password: 'password123' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.session).toEqual(mockSession);
    expect(res.body.error).toBeNull();
  });

  it('TC-AUTH-EDGE-01: returns 400 when email is missing', async () => {
    const req = mockReq('POST', { password: 'password123' });
    const res = mockRes();
    // No supabase mock needed — validation throws before DB call
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabaseMock() as any);
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('TC-AUTH-EDGE-02: returns 400 when password is missing', async () => {
    const req = mockReq('POST', { email: 'a@b.com' });
    const res = mockRes();
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabaseMock() as any);
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  it('TC-AUTH-FAIL-04: returns 400 when Supabase auth returns error (wrong password)', async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as any);

    const req = mockReq('POST', { email: 'a@b.com', password: 'wrongpass' });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('TC-AUTH-FAIL-05: returns 405 for GET request', async () => {
    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('TC-AUTH-EDGE-03: returns 400 when body is completely empty', async () => {
    const req = mockReq('POST', {});
    const res = mockRes();
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabaseMock() as any);
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });
});
