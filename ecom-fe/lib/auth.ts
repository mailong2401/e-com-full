// ecom-fe/lib/auth.ts
import { api } from './api';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  avatar?: string | null;
  isVerified: boolean;
  phone?: string | null;
}

export interface AuthResponse {
  user: User;
  // Không còn accessToken — đã nằm trong cookie
}

// Helper: đọc cookie (dùng để biết user đã login chưa)
const hasAuthCookie = (): boolean => {
  if (typeof document === 'undefined') return false;
  return /(^|;\s*)accessToken=/.test(document.cookie) ||
    /(^|;\s*)refreshToken=/.test(document.cookie);
};

export const authService = {
  register: async (payload: RegisterPayload) => {
    const { data } = await api.post<{ message: string }>(
      '/auth/register/send-otp',
      payload,
    );
    return data;
  },

  verifyRegisterOtp: async (email: string, otp: string) => {
    const { data } = await api.post<AuthResponse>(
      '/auth/register/verify-otp',
      { email, otp, purpose: 'register' },
    );
    return data; // { user }
  },

  resendOtp: async (email: string, purpose: string) => {
    const { data } = await api.post<{ message: string }>('/auth/otp/resend', {
      email,
      purpose,
    });
    return data;
  },

  login: async (payload: LoginPayload) => {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data; // { user }
  },

  logout: async () => {
    await api.post('/auth/logout');
    // Cookie đã bị backend clear
  },

  getProfile: async () => {
    const { data } = await api.get<User>('/auth/profile');
    return data;
  },

  // "Đã login" = có cookie hay không (chỉ là gợi ý, backend vẫn verify)
  isAuthenticated: () => hasAuthCookie(),

  // Không còn saveTokens / getAccessToken
};
