import { getEntry } from "@/lib/concepts";
import { rateLimited } from "@/lib/rate-limit";

// "Solicitar este tema": files a GitHub issue labeled "solicitud". The nightly ETL job
// (.github/workflows/nightly.yml) reads open requests, builds the entries and closes the issues.
//
// Needs GITHUB_TOKEN on Vercel: a fine-grained token with Issues: read & write on this repo only.

const REPO = process.env.GITHUB_REPO ?? "john-casildo/nursedex";
const LABEL = "solicitud";

export async function POST(req: Request) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return Response.json({ error: "not_configured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const topic = typeof body?.topic === "string" ? body.topic.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  if (topic.length < 3) return Response.json({ error: "empty" }, { status: 400 });
  if (rateLimited(req, "request", 10)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const title = `Solicitud: ${topic}`;

  // Don't file the same request twice.
  const open = await fetch(`https://api.github.com/repos/${REPO}/issues?labels=${LABEL}&state=open&per_page=100`, { headers });
  if (open.ok) {
    const issues: { title: string }[] = await open.json();
    if (issues.some((i) => i.title.toLowerCase() === title.toLowerCase())) {
      return Response.json({ ok: true, duplicate: true });
    }
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title,
      labels: [LABEL],
      body: `Tema solicitado desde NurseDex: **${topic}**\n\nEl trabajo nocturno lo procesará automáticamente.${
        getEntry(topic.toLowerCase()) ? "\n\n(Puede que ya exista una entrada parecida.)" : ""
      }`,
    }),
  });
  if (!res.ok) return Response.json({ error: "upstream" }, { status: 502 });
  return Response.json({ ok: true });
}
