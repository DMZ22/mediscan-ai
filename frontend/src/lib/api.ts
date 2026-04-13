/**
 * Feature 1 & 2: Token Refresh + Input Validation helpers
 * Replace src/lib/api.ts with this file
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      if (original.url?.includes('/auth/login/')) {
        // Login failed — just reject, let Login.tsx handle the error display
        return Promise.reject(err);
      }

      if (original.url?.includes('/auth/refresh/')) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      }

      try {
        const { data } = await axios.post(`${api.defaults.baseURL}/api/auth/refresh/`, {
          refresh,
        });
        localStorage.setItem('access_token', data.access);
        api.defaults.headers.common.Authorization = `Bearer ${data.access}`;
        processQueue(null, data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;

// ── Feature 2: Input Validation Helpers ──────────────────────────────
export const validateAssessment = (formData: Record<string, number>) => {
  const errors: Record<string, string> = {};

  if (formData.bmi < 10 || formData.bmi > 80)
    errors.bmi = 'BMI must be between 10 and 80';
  if (formData.ment_health < 0 || formData.ment_health > 30)
    errors.ment_health = 'Must be 0–30 days';
  if (formData.phys_health < 0 || formData.phys_health > 30)
    errors.phys_health = 'Must be 0–30 days';
  if (formData.gen_health < 1 || formData.gen_health > 5)
    errors.gen_health = 'Must be 1–5';
  if (formData.age_category < 1 || formData.age_category > 13)
    errors.age_category = 'Invalid age category';

  return { valid: Object.keys(errors).length === 0, errors };
};