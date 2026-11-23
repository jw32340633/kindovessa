import "server-only";

type ApiRequestOptions = RequestInit & { json?: unknown };

export async function apiRequest<T>(
  path: `/${string}`,
  { json, headers: inputHeaders, signal, ...options }: ApiRequestOptions = {},
): Promise<T> {
  const base = process.env.API_URL;
  if (!base) throw new Error("Set API_URL in the storefront environment.");
  const origin = new URL(base);
  const url = new URL(path, origin);
  if (url.origin !== origin.origin) throw new Error("Invalid backend request path.");

  const headers = new Headers(inputHeaders);
  headers.set("Accept", "application/json");
  if (json !== undefined) headers.set("Content-Type", "application/json");
  const timeout = AbortSignal.timeout(5000);
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers,
    body: json === undefined ? options.body : JSON.stringify(json),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error(`Backend request failed with status ${response.status}.`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
