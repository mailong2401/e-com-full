'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService, User } from '@/lib/auth';

export function useAuth(requireAuth = false) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!authService.isAuthenticated()) {
        if (requireAuth) router.push('/login');
        setLoading(false);
        return;
      }

      try {
        const profile = await authService.getProfile();
        setUser(profile);
      } catch {
        if (requireAuth) router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [requireAuth, router]);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    router.push('/login');
  }, [router]);

  return { user, loading, logout, isAuthenticated: !!user };
}
