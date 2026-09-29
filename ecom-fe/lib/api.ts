// ecom-fe/lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Fallback '/api' để chạy được sau nginx khi quên set biến môi trường
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const AUTH_EXPIRED_EVENT = 'auth:expired';

const DEVICE_ID_KEY = 'deviceId';
const SESSION_HINT_COOKIE = 'csrfToken'; // non-httpOnly, sống 7 ngày, bị xoá khi logout

export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId || deviceId.length < 8) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(^|;\\s*)' + name + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[2]) : null;
};

/**
 * Có dấu hiệu đã từng đăng nhập không?
 * accessToken/refreshToken là httpOnly nên JS không đọc được →
 * dùng csrfToken (backend set lúc login, xoá lúc logout) làm "gợi ý".
 * Khách chưa đăng nhập → false → KHÔNG gọi /auth/profile, KHÔNG refresh.
 */
export const hasSessionHint = (): boolean => !!getCookie(SESSION_HINT_COOKIE);

export const clearSessionHint = () => {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_HINT_COOKIE}=; Max-Age=0; path=/`;
};

// ---------------- Request interceptor ----------------
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    config.headers['X-Device-Id'] = getDeviceId();
    const csrfToken = getCookie('csrfToken');
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// ---------------- Refresh (shared promise) ----------------
let refreshPromise: Promise<void> | null = null;

function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: {
            'X-Device-Id': getDeviceId(),
            'X-CSRF-Token': getCookie('csrfToken') ?? '',
          },
        },
      )
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Các endpoint không bao giờ được thử refresh khi gặp 401
const NO_REFRESH_PATHS = [
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/otp',
];

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// ---------------- Response interceptor ----------------
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;

    // Lỗi mạng / không có config → không xử lý
    if (!original) return Promise.reject(error);

    const status = error.response?.status;
    const skip = NO_REFRESH_PATHS.some((p) => original.url?.includes(p));

    if (status !== 401 || original._retry || skip) {
      return Promise.reject(error);
    }

    // Khách chưa đăng nhập: 401 là bình thường → trả lỗi luôn, không refresh
    if (!hasSessionHint()) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      await refreshAccessToken();
      return api(original);
    } catch (refreshError) {
      const refreshStatus = axios.isAxiosError(refreshError)
        ? refreshError.response?.status
        : undefined;

      // Chỉ coi là hết phiên khi server từ chối thật sự (không phải lỗi mạng)
      if (refreshStatus === 401 || refreshStatus === 403) {
        clearSessionHint(); // → các lần sau sẽ không refresh nữa
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        }
      }
      return Promise.reject(refreshError);
    }
  },
);
