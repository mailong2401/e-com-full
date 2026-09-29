// ecom-fe/lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ============================================================
// DEVICE ID — tạo một lần, lưu localStorage, gửi mọi request
// ============================================================
const DEVICE_ID_KEY = 'deviceId';

export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId || deviceId.length < 8) {
    // crypto.randomUUID() trả về 36 ký tự — thỏa điều kiện >= 8
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
};

// ============================================================
// HELPER đọc cookie (cho CSRF token)
// ============================================================
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(^|;\\s*)' + name + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[2]) : null;
};

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    // 1. Gắn device ID cho MỌI request
    config.headers['X-Device-Id'] = getDeviceId();

    // 2. Gắn CSRF token cho mọi request (nếu có)
    const csrfToken = getCookie('csrfToken');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    // 3. (Tùy chọn) Nếu vẫn dùng Bearer token ở một số nơi
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ============================================================
// RESPONSE INTERCEPTOR — refresh khi 401
// ============================================================
let isRefreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push(() => resolve(api(original)));
        });
      }

      isRefreshing = true;
      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              'X-Device-Id': getDeviceId(),
              'X-CSRF-Token': getCookie('csrfToken') ?? '',
            },
          },
        );

        queue.forEach((cb) => cb());
        queue = [];

        return api(original);
      } catch (err) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
