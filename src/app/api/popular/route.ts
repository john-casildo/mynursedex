import { getEntry } from "@/lib/concepts";
import { rateLimited } from "@/lib/rate-limit";

// Most-looked-up entries, shared by everyone, counted in a Redis sorted set (Upstash free plan).
//   GET  → { ids: [...top 15], configured }
//   POST { id } → counts one view of that entry
// Without Redis env vars it reports configured: false and the site falls back to per-device counts.

const URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "nursedex:views";

async function redis(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return (await res.json()).result;
}

export async function GET() {
  if (!URL || !TOKEN) return Response.json({ ids: [], configured: false });
  try {
    const ids = ((await redis(["ZREVRANGE", KEY, 0, 14])) as string[]).filter((id) => getEntry(id));
    // Cached briefly at the edge so a busy page doesn't hit Redis on every visit.
    return Response.json({ ids, configured: true }, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    return Response.json({ ids: [], configured: true });
  }
}

export async function POST(req: Request) {
  if (!URL || !TOKEN) return Response.json({ ok: false, configured: false });
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!getEntry(id)) return Response.json({ error: "unknown" }, { status: 400 });
  if (rateLimited(req, "view", 120)) return Response.json({ ok: true });
  try {
    await redis(["ZINCRBY", KEY, 1, id]);
  } catch {
    // counting is best-effort
  }
  return Response.json({ ok: true });
}
