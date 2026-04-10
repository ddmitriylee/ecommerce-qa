import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase.js', () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock('../../../lib/cors.js', () => ({
  cors: vi.fn(() => false),
}));

import { getSupabaseAdmin } from '../../../lib/supabase.js';
import handler from '../../../api/auth/refresh.js';

function makeSupabaseMock(overrides: Record<string, any> = {}) {
  return {
    auth: {
      refreshSession: vi.fn(),
      ...overrides.auth,
    },
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

describe('POST /auth/refresh', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-REF-UNIT-01: returns 200 with new session on valid refresh_token', async () => {
    const newSession = { access_token: 'new-access', refresh_token: 'new-refresh' };
    const supabase = makeSupabaseMock();
    supabase.auth.refreshSession.mockResolvedValue({
      data: { session: newSession },
      error: null,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as any);

    const req = mockReq('POST', { refresh_token: 'old-refresh' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.session).toEqual(newSession);
    expect(res.body.error).toBeNull();
  });

  it('TC-REF-EDGE-01: returns 400 when refresh_token is missing', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabaseMock() as any);
    const req = mockReq('POST', {});
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/refresh_token/i);
  });

  it('TC-REF-FAIL-01: returns 400 when Supabase returns error (expired token)', async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid Refresh Token' },
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as any);

    const req = mockReq('POST', { refresh_token: 'expired-token' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('TC-REF-FAIL-02: returns 405 for GET request', async () => {
    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('TC-REF-FAIL-03: returns 405 for DELETE request', async () => {
    const req = mockReq('DELETE');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('TC-REF-EDGE-02: returns 400 when body is completely empty', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabaseMock() as any);
    const req = mockReq('POST', undefined);
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });
});
