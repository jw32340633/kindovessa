import { NextResponse, type NextRequest } from 'next/server';
export async function proxy(request: NextRequest) {
  const name = process.env.NODE_ENV === 'production' ? '__Host-admin_session' : 'admin_session';
  const token = request.cookies.get(name)?.value;
  const isLogin = request.nextUrl.pathname === '/';
  if (!token) return isLogin ? NextResponse.next() : NextResponse.redirect(new URL('/', request.url));
  try {
    const base = process.env.API_URL;
    if (!base) throw new Error('API_URL is missing');
    const response = await fetch(`${base.replace(/\/$/, '')}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401) {
      const result = isLogin ? NextResponse.next() : NextResponse.redirect(new URL('/', request.url));
      result.cookies.set(name, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
      return result;
    }
    if (!response.ok) throw new Error('Authentication unavailable');
    return isLogin ? NextResponse.redirect(new URL('/dashboard', request.url)) : NextResponse.next();
  } catch {
    return new NextResponse('Authentication is temporarily unavailable. Please try again shortly.', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '10' } });
  }
}
export const config = { matcher: ['/', '/dashboard/:path*'] };
