import { NextRequest, NextResponse } from 'next/server';
import { apiUrl, sessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!['login', 'logout', 'refresh', 'settings'].includes(action)) return NextResponse.json({ error: { message: 'Not found.' } }, { status: 404 });
  // Exact same-origin check prevents cross-site cookie-authenticated mutations.
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: { message: 'Origin not allowed.' } }, { status: 403 });
  const token = request.cookies.get(sessionCookie)?.value;
  if (action !== 'login' && !token) return NextResponse.json({ error: { message: 'Please sign in again.' } }, { status: 401 });
  try {
    let body: string | undefined;
    if (action === 'login' || action === 'settings') {
      const text = await request.text();
      if (text.length > 4096) return NextResponse.json({ error: { message: 'Request too large.' } }, { status: 413 });
      try { body = JSON.stringify(JSON.parse(text)); }
      catch { return NextResponse.json({ error: { message: 'Invalid request.' } }, { status: 400 }); }
    }
    const upstream = await fetch(apiUrl(action), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body, cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const data = upstream.status === 204 ? {} : await upstream.json();
    const response = NextResponse.json(upstream.ok ? { user: data.user, expiresAt: data.expiresAt, requiresLogin: data.requiresLogin } : { error: { message: data.error?.message ?? 'Unable to complete request.', fields: data.error?.fields } }, { status: upstream.status === 204 ? 200 : upstream.status, headers: { 'Cache-Control': 'no-store' } });
    if (upstream.ok && data.token) response.cookies.set(sessionCookie, data.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', expires: new Date(data.expiresAt) });
    if ((action === 'logout' && (upstream.ok || upstream.status === 401)) || upstream.status === 401 || (upstream.ok && data.requiresLogin)) response.cookies.set(sessionCookie, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
    return response;
  } catch { return NextResponse.json({ error: { message: 'Unable to reach the server. Please try again.' } }, { status: 503 }); }
}
