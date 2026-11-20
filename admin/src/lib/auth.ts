import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export type AdminUser = { id: string; firstName: string; lastName: string; email: string; username: string };
export const sessionCookie = process.env.NODE_ENV === 'production' ? '__Host-admin_session' : 'admin_session';
export function apiUrl(path: string) {
  const base = process.env.API_URL;
  if (!base) throw new Error('API_URL must be configured for the admin server.');
  return `${base.replace(/\/$/, '')}/api/v1/auth/${path}`;
}
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const response = await fetch(apiUrl('me'), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Authentication is temporarily unavailable. Please try again.');
  return (await response.json()).user;
});
export async function requireAdmin() {
  const user = await getAdmin();
  if (!user) redirect('/');
  return user;
}
