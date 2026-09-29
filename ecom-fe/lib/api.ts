// ecom-fe/lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const DEVICE_ID_KEY = 'deviceId';

export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId || deviceId.length < 8) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(^|;\\s*)' + name + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[2]) : null;
};

// Request interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    config.headers['X-Device-Id'] = getDeviceId();
    const csrfToken = getCookie('csrfToken');
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// ============================================================
// REFRESH LOGIC — dùng SHARED PROMISE, không dùng queue thủ công
// ============================================================
let refreshPromise: Promise<void> | null = null;

/**
 * Gọi refresh 1 lần duy nhất. Các caller khác chờ cùng promise.
 */
async function refreshAccessToken(): Promise<void> {
  // Nếu đang refresh → trả về promise hiện tại (share)
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
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
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Không refresh chính endpoint refresh/login
    if (
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        // Chờ refresh hoàn tất (dù là lần đầu hay đang chờ shared promise)
        await refreshAccessToken();

        // Retry request ban đầu — cookie mới đã được set
        return api(original);
      } catch (refreshError) {
        // Refresh thất bại → logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
