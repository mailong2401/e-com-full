// lib/auth.ts
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

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  avatar?: string | null;
}

export const authService = {
  register: async (payload: RegisterPayload) => {
    const { data } = await api.post<{ message: string }>(
      '/auth/register/send-otp',
      payload,
    );
    return data;
  },

  verifyRegisterOtp: async (email: string, otp: string) => {
    const { data } = await api.post<{ user: User; tokens: AuthTokens }>(
      '/auth/register/verify-otp',
      { email, otp, purpose: 'register' },
    );
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
    const { data } = await api.post<{ user: User; tokens: AuthTokens }>(
      '/auth/login',
      payload,
    );
    return data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  getProfile: async () => {
    const { data } = await api.get<User>('/auth/profile');
    return data;
  },

  saveTokens: (tokens: AuthTokens) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  },

  getAccessToken: () =>
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,

  isAuthenticated: () =>
    typeof window !== 'undefined' && !!localStorage.getItem('accessToken'),
};
