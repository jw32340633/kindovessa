import { NextRequest, NextResponse } from 'next/server';
import { apiUrl, sessionCookie } from '@/lib/auth';

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  if (path.length > 1 || (path[0] && path[0] !== 'bulk' && !/^[a-f0-9-]{36}$/i.test(path[0]))) return NextResponse.json({ error: { message: 'Invalid product path.' } }, { status: 400 });
  if (request.method !== 'GET' && request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: { message: 'Origin not allowed.' } }, { status: 403 });
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: { message: 'Please sign in again.' } }, { status: 401 });
  try {
    let body: string | undefined;
    if (request.method !== 'GET') {
      body = await request.text();
      if (Buffer.byteLength(body) > 256 * 1024) return NextResponse.json({ error: { message: 'Product data is too large.' } }, { status: 413 });
      try { JSON.parse(body); } catch { return NextResponse.json({ error: { message: 'Invalid JSON.' } }, { status: 400 }); }
    }
    const url = `${apiUrl('me').replace(/\/auth\/me$/, '/products')}${path[0] ? `/${path[0]}` : ''}${request.nextUrl.search}`;
    const upstream = await fetch(url, { method: request.method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body, cache: 'no-store', signal: AbortSignal.timeout(20000) });
    const response = upstream.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(await upstream.json(), { status: upstream.status });
    response.headers.set('Cache-Control', 'no-store');
    if (upstream.status === 401) response.cookies.set(sessionCookie, '', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0 });
    return response;
  } catch { return NextResponse.json({ error: { message: 'Unable to reach the catalog service. Please try again.' } }, { status: 503 }); }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
