// Best-effort in-memory rate limiting for the web transport.
//
// Blunts spam / gas-drain on a single serverless instance. For real
// multi-instance limits, front with an edge limiter (Vercel WAF / Upstash);
// this is the floor, not the wall. Kept out of core/ on purpose — it's a
// transport concern (it returns a NextResponse), not settlement logic.

import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientKey(request: Request, scope: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

/**
 * Fixed-window limiter: at most `limit` requests per `windowMs` per IP+scope.
 * Returns a 429 response when exceeded, else null.
 */
export function rateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): NextResponse | null {
  const key = clientKey(request, scope);
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (b.count >= limit) {
    const retry = Math.ceil((b.resetAt - now) / 1000);
    return NextResponse.json(
      { ok: false, error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }
  b.count++;
  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
  }
  return null;
}
