import { NextRequest, NextResponse } from "next/server";
import { apiUrl, sessionCookie } from "@/lib/auth";

function error(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status, headers: { "Cache-Control": "no-store" } });
}

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const [target] = path;
  if (path.length > 1 ||
    (target && target !== "bulk" && !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(target))) {
    return error("Catalog route not found.", 404);
  }
  const write = request.method !== "GET";
  if (write && request.headers.get("origin") !== request.nextUrl.origin) return error("Origin is not allowed.", 403);
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return error("Please sign in again.", 401);

  let body: string | undefined;
  if (write) {
    const reader = request.body?.getReader();
    if (!reader) return error("A JSON request body is required.", 400);
    const maxBytes = 256 * 1024;
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let bytes = 0;
    try {
      body = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) {
          await reader.cancel().catch(() => undefined);
          return error("Catalog data is too large.", 413);
        }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
      JSON.parse(body);
    } catch {
      return error("Invalid JSON.", 400);
    } finally {
      reader.releaseLock();
    }
  }
  try {
    const url = apiUrl("me").replace(/\/auth\/me$/, "/catalog/products") +
      (target ? `/${target}` : "") + request.nextUrl.search;
    const upstream = await fetch(url, {
      method: request.method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body, cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    const response = upstream.status === 204 ? new NextResponse(null, { status: 204 }) :
      NextResponse.json(await upstream.json(), { status: upstream.status });
    response.headers.set("Cache-Control", "no-store");
    if (upstream.status === 401) response.cookies.set(sessionCookie, "", {
      path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 0,
    });
    return response;
  } catch {
    return error("Unable to reach the catalog service. Please try again.", 503);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
