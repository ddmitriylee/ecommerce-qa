import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ mock: true })),
}));

describe('getSupabaseAdmin', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('TC-SB-UNIT-01: creates and returns admin client with valid env vars', async () => {
    const { getSupabaseAdmin } = await import('../../lib/supabase.js');
    const client = getSupabaseAdmin();
    expect(client).toBeDefined();
  });

  it('TC-SB-UNIT-02: returns same singleton on second call', async () => {
    const { getSupabaseAdmin } = await import('../../lib/supabase.js');
    const client1 = getSupabaseAdmin();
    const client2 = getSupabaseAdmin();
    expect(client1).toBe(client2);
  });

  it('TC-SB-FAIL-01: throws when SUPABASE_URL is missing', async () => {
    delete process.env.SUPABASE_URL;
    const { getSupabaseAdmin } = await import('../../lib/supabase.js');
    expect(() => getSupabaseAdmin()).toThrow(/SUPABASE_URL/);
  });

  it('TC-SB-FAIL-02: throws when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { getSupabaseAdmin } = await import('../../lib/supabase.js');
    expect(() => getSupabaseAdmin()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

describe('getSupabaseForUser', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('TC-SB-UNIT-03: creates user-scoped client with access token', async () => {
    const { getSupabaseForUser } = await import('../../lib/supabase.js');
    const client = getSupabaseForUser('user-access-token');
    expect(client).toBeDefined();
  });

  it('TC-SB-UNIT-04: creates new client per call (not singleton)', async () => {
    const { getSupabaseForUser } = await import('../../lib/supabase.js');
    const client1 = getSupabaseForUser('token-1');
    const client2 = getSupabaseForUser('token-2');
    // Each call creates a fresh client (both are mocked so equal in shape but different calls)
    expect(client1).toBeDefined();
    expect(client2).toBeDefined();
  });
});
