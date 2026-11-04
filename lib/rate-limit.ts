// Tiny per-key sliding-window rate limiter (single-instance demo scope).
// For multi-instance deployments, swap the Map for Redis/Upstash — the
// call sites only need the boolean.
const buckets = new Map<string, { windowStart: number; count: number }>();
const MAX_KEYS = 10_000;

export function checkRate(
  key: string,
  limit: number,
  windowMs: number = 60_000,
): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.windowStart >= windowMs) {
    if (buckets.size >= MAX_KEYS) buckets.clear();
    buckets.set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "local";
}
