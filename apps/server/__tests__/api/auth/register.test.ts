import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase.js', () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock('../../../lib/cors.js', () => ({
  cors: vi.fn(() => false),
}));

import { getSupabaseAdmin } from '../../../lib/supabase.js';
import handler from '../../../api/auth/register.js';

function makeSupabaseMock(overrides: Record<string, any> = {}) {
  return {
    auth: {
      admin: { createUser: vi.fn() },
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

describe('POST /auth/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-REG-UNIT-01: returns 201 on successful registration', async () => {
    const newUser = { id: 'new-u1', email: 'new@test.com' };
    const mockSession = { access_token: 'new-tok', refresh_token: 'new-ref' };

    const supabase = makeSupabaseMock();
    supabase.auth.admin.createUser.mockResolvedValue({
      data: { user: newUser },
      error: null,
    });
    supabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: newUser, session: mockSession },
      error: null,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as any);

    const req = mockReq('POST', { email: 'new@test.com', password: 'pass123', full_name: 'New User' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.session).toEqual(mockSession);
  });

  it('TC-REG-EDGE-01: returns 400 when full_name is missing', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabaseMock() as any);
    const req = mockReq('POST', { email: 'a@b.com', password: 'pass' });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/full_name/i);
  });

  it('TC-REG-EDGE-02: returns 400 when email is missing', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabaseMock() as any);
    const req = mockReq('POST', { password: 'pass', full_name: 'Name' });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('TC-REG-FAIL-01: returns 400 when Supabase returns user-already-exists error', async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as any);

    const req = mockReq('POST', { email: 'existing@test.com', password: 'pass', full_name: 'X' });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/already/i);
  });

  it('TC-REG-FAIL-02: returns 405 for DELETE method', async () => {
    const req = mockReq('DELETE');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('TC-REG-EDGE-03: returns 400 with completely empty body', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabaseMock() as any);
    const req = mockReq('POST', {});
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });
});
