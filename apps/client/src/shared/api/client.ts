import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const session = localStorage.getItem('session');
  if (session) {
    try {
      const { access_token } = JSON.parse(session);
      if (access_token) {
        config.headers.Authorization = `Bearer ${access_token}`;
      }
    } catch {
      // Ignore parse error
    }
  }
  return config;
});

// Response interceptor: handle 401 + refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const session = localStorage.getItem('session');
      if (session) {
        try {
          const { refresh_token } = JSON.parse(session);
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token });

          if (data.data?.session) {
            localStorage.setItem('session', JSON.stringify(data.data.session));
            originalRequest.headers.Authorization = `Bearer ${data.data.session.access_token}`;
            return api(originalRequest);
          }
        } catch {
          localStorage.removeItem('session');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);
