"use client";

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { AdminUser } from '@/lib/auth';

const AuthContext = createContext<{ user: AdminUser; logout: () => Promise<void>; loggingOut: boolean } | null>(null);
export function AuthProvider({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const refreshing = useRef(false);
  useEffect(() => {
    const refresh = async () => {
      if (refreshing.current) return;
      refreshing.current = true;
      try {
        const response = await fetch('/api/auth/refresh', { method: 'POST' });
        if (response.status === 401) { toast.error('Your session expired. Please sign in again.'); window.location.replace('/'); }
      } finally { refreshing.current = false; }
    };
    const timer = setInterval(() => { void refresh().catch(() => {}); }, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [router]);
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok && response.status !== 401) throw new Error();
      toast.success('Signed out.'); router.replace('/'); router.refresh();
    } catch { toast.error('Unable to sign out. Please try again.'); }
    finally { setLoggingOut(false); }
  }
  return <AuthContext.Provider value={{ user, logout, loggingOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const auth = useContext(AuthContext); if (!auth) throw new Error('AuthProvider is required'); return auth; }
