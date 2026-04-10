import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

// Mock the API client
vi.mock('../../shared/api/client', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from '../../shared/api/client';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get _store() { return store; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // login
  // ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('TC-STORE-AUTH-01: sets user and isAuthenticated on successful login', async () => {
      const mockUser = { id: 'u1', email: 'test@test.com', profile: { full_name: 'Test' } };
      const mockSession = { access_token: 'tok', refresh_token: 'ref' };

      vi.mocked(api.post).mockResolvedValue({
        data: { data: { user: mockUser, session: mockSession } },
      });

      await useAuthStore.getState().login('test@test.com', 'password123');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('session', JSON.stringify(mockSession));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    });

    it('TC-STORE-AUTH-02: sets error on failed login', async () => {
      vi.mocked(api.post).mockRejectedValue({
        response: { data: { error: 'Invalid login credentials' } },
      });

      await useAuthStore.getState().login('test@test.com', 'wrongpass');

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid login credentials');
      expect(state.isLoading).toBe(false);
    });

    it('TC-STORE-AUTH-03: sets generic error when no response data', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().login('test@test.com', 'pass');

      const state = useAuthStore.getState();
      expect(state.error).toBe('Login failed');
    });

    it('TC-STORE-AUTH-04: sets isLoading during login', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => { resolvePromise = resolve; });
      vi.mocked(api.post).mockReturnValue(pendingPromise as any);

      const loginPromise = useAuthStore.getState().login('test@test.com', 'pass');

      expect(useAuthStore.getState().isLoading).toBe(true);

      resolvePromise!({
        data: { data: { user: { id: 'u1' }, session: {} } },
      });
      await loginPromise;

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // register
  // ─────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('TC-STORE-AUTH-05: sets user and isAuthenticated on successful register', async () => {
      const mockUser = { id: 'u2', email: 'new@test.com' };
      const mockSession = { access_token: 'tok2', refresh_token: 'ref2' };

      vi.mocked(api.post).mockResolvedValue({
        data: { data: { user: mockUser, session: mockSession } },
      });

      await useAuthStore.getState().register('new@test.com', 'pass123', 'New User');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('TC-STORE-AUTH-06: sets error on registration failure', async () => {
      vi.mocked(api.post).mockRejectedValue({
        response: { data: { error: 'User already registered' } },
      });

      await useAuthStore.getState().register('existing@test.com', 'pass', 'Name');

      expect(useAuthStore.getState().error).toBe('User already registered');
    });

    it('TC-STORE-AUTH-07: sets generic error when no response data on register', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().register('test@test.com', 'pass', 'Name');

      expect(useAuthStore.getState().error).toBe('Registration failed');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // logout
  // ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('TC-STORE-AUTH-08: clears user state and localStorage', () => {
      useAuthStore.setState({ user: { id: 'u1', email: 'a@b.com' }, isAuthenticated: true });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('session');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // loadSession
  // ─────────────────────────────────────────────────────────────────

  describe('loadSession', () => {
    it('TC-STORE-AUTH-09: restores user from localStorage', () => {
      const user = { id: 'u1', email: 'test@test.com' };
      localStorageMock.setItem('user', JSON.stringify(user));
      localStorageMock.setItem('session', JSON.stringify({ access_token: 'tok' }));

      useAuthStore.getState().loadSession();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
    });

    it('TC-STORE-AUTH-10: does nothing when no stored session', () => {
      useAuthStore.getState().loadSession();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('TC-STORE-AUTH-11: clears invalid JSON from localStorage', () => {
      localStorageMock.setItem('user', 'invalid-json{');
      localStorageMock.setItem('session', 'also-invalid');

      useAuthStore.getState().loadSession();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('session');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // clearError
  // ─────────────────────────────────────────────────────────────────

  describe('clearError', () => {
    it('TC-STORE-AUTH-12: clears error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
