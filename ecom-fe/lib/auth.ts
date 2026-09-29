// ecom-fe/lib/auth.ts
import { api, hasSessionHint } from './api';

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
}

// Dùng chung 1 request đang bay (tránh gọi 2 lần do React StrictMode / nhiều component)
let profilePromise: Promise<User> | null = null;

export const authService = {
  register: async (payload: RegisterPayload) => {
    const { data } = await api.post<{ message: string }>(
      '/auth/register/send-otp',
      payload,
    );
    return data;
  },

  verifyRegisterOtp: async (email: string, otp: string) => {
    const { data } = await api.post<AuthResponse>('/auth/register/verify-otp', {
      email,
      otp,
      purpose: 'register',
    });
    return data;
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
    return data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },

  getProfile: (): Promise<User> => {
    if (!profilePromise) {
      profilePromise = api
        .get<User>('/auth/profile')
        .then((res) => res.data)
        .finally(() => {
          profilePromise = null;
        });
    }
    return profilePromise;
  },

  // Chỉ là gợi ý; backend vẫn là nơi verify thật
  hasSession: () => hasSessionHint(),
};
