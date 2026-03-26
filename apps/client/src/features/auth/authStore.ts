import { create } from 'zustand';
import { api } from '../../shared/api/client';

interface User {
  id: string;
  email: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
    address: string | null;
    role: string;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  loadSession: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data: res } = await api.post('/auth/login', { email, password });
      const { user, session } = res.data;
      localStorage.setItem('session', JSON.stringify(session));
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      set({
        error: error.response?.data?.error || 'Login failed',
        isLoading: false,
      });
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      const { data: res } = await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
      });
      const { user, session } = res.data;
      localStorage.setItem('session', JSON.stringify(session));
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      set({
        error: error.response?.data?.error || 'Registration failed',
        isLoading: false,
      });
    }
  },

  logout: () => {
    localStorage.removeItem('session');
    localStorage.removeItem('user');
    set({ user: null, isAuthenticated: false });
  },

  loadSession: () => {
    const userJson = localStorage.getItem('user');
    const sessionJson = localStorage.getItem('session');
    if (userJson && sessionJson) {
      try {
        const user = JSON.parse(userJson);
        set({ user, isAuthenticated: true });
      } catch {
        localStorage.removeItem('session');
        localStorage.removeItem('user');
      }
    }
  },

  clearError: () => set({ error: null }),
}));
