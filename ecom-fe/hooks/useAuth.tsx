// ecom-fe/hooks/useAuth.tsx
'use client';

import {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService, User } from '@/lib/auth';
import { AUTH_EXPIRED_EVENT, clearSessionHint, hasSessionHint } from '@/lib/api';
import { isProtectedPath } from '@/lib/routes';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Gọi sau khi login / verify OTP thành công để cập nhật header ngay */
  setUser: (user: User | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    // Khách chưa đăng nhập → không gọi API (nguyên nhân gây vòng lặp request)
    if (!hasSessionHint()) {
      setUser(null);
      return;
    }
    try {
      setUser(await authService.getProfile());
    } catch {
      setUser(null);
    }
  }, []);

  // Chạy đúng 1 lần khi app mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchProfile();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  // Phiên hết hạn (refresh thất bại) → xoá user, chỉ redirect nếu đang ở trang cần đăng nhập
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      if (isProtectedPath(pathname)) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [pathname, router]);

  const refresh = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
      clearSessionHint();
      setUser(null);
      router.replace('/login');
      router.refresh();
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        setUser,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
