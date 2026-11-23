import { NextRequest, NextResponse } from "next/server";
import { apiUrl, sessionCookie } from "@/lib/auth";

function error(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const [target] = path;
  const write = request.method === "PUT";
  if (write ? path.length !== 1 || !/^(visibility|[\da-f-]{36})$/i.test(target ?? "") : path.length > 0) {
    return error("Invalid sales route.", 404);
  }
  if (write && request.headers.get("origin") !== request.nextUrl.origin) {
    return error("Origin is not allowed.", 403);
  }
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return error("Please sign in again.", 401);

  let body: string | undefined;
  if (write) {
    const reader = request.body?.getReader();
    if (!reader) return error("A JSON request body is required.", 400);
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let bytes = 0;
    try {
      body = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 64 * 1024) {
          await reader.cancel();
          return error("Sales data is too large.", 413);
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
    const upstream = await fetch(apiUrl("me").replace(/\/auth\/me$/, "/sales") + (target ? `/${target}` : ""), {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const response = NextResponse.json(await upstream.json(), {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
    if (upstream.status === 401) {
      response.cookies.set(sessionCookie, "", {
        path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 0,
      });
    }
    return response;
  } catch {
    return error("Unable to reach the sales service. Please try again.", 503);
  }
}

export const GET = handle;
export const PUT = handle;
