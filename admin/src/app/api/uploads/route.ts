import { NextRequest, NextResponse } from 'next/server';
import { apiUrl, sessionCookie } from '@/lib/auth';

export const maxDuration = 30;
export async function POST(request: NextRequest) {
 if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: { message: 'Origin not allowed.' } }, { status: 403 });
 const token = request.cookies.get(sessionCookie)?.value;
 if (!token) return NextResponse.json({ error: { message: 'Please sign in again.' } }, { status: 401 });
 const limit = 3 * 1024 * 1024;
 if (request.headers.get('content-type') !== 'application/octet-stream') return NextResponse.json({ error: { message: 'Unsupported upload.' } }, { status: 415 });
 if (Number(request.headers.get('content-length')) > limit) return NextResponse.json({ error: { message: 'Images must be 3 MB or smaller.' } }, { status: 413 });
 try {
  // Bound streaming input too: Content-Length is not a trusted size check.
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: { message: 'Choose an image.' } }, { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
   const part = await reader.read(); if (part.done) break;
   size += part.value.byteLength;
   if (size > limit) { await reader.cancel(); return NextResponse.json({ error: { message: 'Images must be 3 MB or smaller.' } }, { status: 413 }); }
   chunks.push(part.value);
  }
  const upstream = await fetch(apiUrl('me').replace(/\/auth\/me$/, '/uploads'), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' }, body: Buffer.concat(chunks), cache: 'no-store', signal: AbortSignal.timeout(25000) });
  return NextResponse.json(await upstream.json(), { status: upstream.status, headers: { 'Cache-Control': 'no-store' } });
 } catch { return NextResponse.json({ error: { message: 'Unable to upload image. Please try again.' } }, { status: 503 }); }
}
