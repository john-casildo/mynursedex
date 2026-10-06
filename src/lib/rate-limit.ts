// Best-effort, per-instance rate limit so strangers on the public site can't burn the free AI quota.
// Serverless instances come and go, so this is a speed bump, not a guarantee.
const hits = new Map<string, number[]>();

export function rateLimited(req: Request, key: string, max: number, windowMs = 60 * 60 * 1000): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const id = `${key}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(id, recent);
    return true;
  }
  recent.push(now);
  hits.set(id, recent);
  return false;
}
