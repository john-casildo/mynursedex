/* eslint-disable @typescript-eslint/no-explicit-any -- responses from external APIs are untyped JSON */
// QUEUE: decides what the nightly job builds.
//   1. Open GitHub issues labeled "solicitud" AND "aprobado" (filed by the site's "Solicitar este
//      tema" button, then approved by the owner; unapproved requests just wait).
//   2. Then planned topics in data/topics.txt (except hand-written "manual" sections).
//   3. Then related topics that entries link to but that don't exist yet.
// Topics already listed in data/topics.txt are left alone (they're planned separately).
// Each candidate is checked by a small model (is it a nursing topic? which category? English name?)
// so typos, duplicates and junk don't become entries.

import { AREAS, CATEGORIES, norm, readTopics, slugify, type Concept, type Job } from "./lib.mts";
import { TRANSLATE_MODEL, groq } from "./transform.mts";

const REPO = process.env.GITHUB_REPOSITORY ?? "john-casildo/mynursedex";
const SITE = process.env.SITE_URL ?? "https://mynursedex.vercel.app";
const LABEL = "solicitud";
// Only requests the owner approved (reply "aprobar" to the email, or add the label) are built.
const APPROVED = "aprobado";

export type QueueItem = Job & { issue?: number };

async function github(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

export async function closeIssue(issue: number, comment: string) {
  await github(`/issues/${issue}/comments`, { method: "POST", body: JSON.stringify({ body: comment }) });
  await github(`/issues/${issue}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
}

type Verdict = { nursing: boolean; category: string; term_en: string; area: string | null };

const CLASSIFY_PROMPT = `You sort topic requests for MyNurseDex, a nursing study reference for students in Costa Rica.
The request may be in Spanish or English and may have typos.
Return ONLY JSON: {"nursing": true|false, "category": one of ${JSON.stringify(CATEGORIES)}, "term_en": the standard English name (generic name for drugs, e.g. "furosemide"; condition name, e.g. "appendicitis"), "area": one of ${JSON.stringify(Object.keys(AREAS))} or null}.
"nursing" is false for anything that isn't a health, nursing or medical topic, or is gibberish.
Use "fundamentals" for procedures, assessments, scales and nursing skills. Use "area" only when the topic clearly belongs to it.`;

async function classify(topic: string): Promise<Verdict | null> {
  const data = await groq("/chat/completions", {
    model: TRANSLATE_MODEL,
    temperature: 0,
    max_completion_tokens: 800,
    reasoning_effort: "low",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CLASSIFY_PROMPT },
      { role: "user", content: topic },
    ],
  });
  try {
    const v = JSON.parse(data.choices[0].message.content);
    if (typeof v.nursing !== "boolean" || !CATEGORIES.includes(v.category) || typeof v.term_en !== "string") return null;
    return { ...v, area: v.area && AREAS[v.area] ? v.area : null };
  } catch {
    return null;
  }
}

// Finds an existing entry by id, term or alias in either language.
function findExisting(entries: Concept[], text: string): Concept | undefined {
  const n = norm(text);
  const id = slugify(text);
  return entries.find(
    (e) =>
      e.id === id ||
      [e.es, e.en].some((t) => norm(t.term.replace(/\s*\(.*?\)/g, "")) === n || t.aliases.some((a) => norm(a) === n)),
  );
}

export async function buildQueue(entries: Concept[], limit: number): Promise<QueueItem[]> {
  const queue: QueueItem[] = [];
  const taken = new Set<string>();

  // 1. Her requests first.
  const issues: { number: number; title: string }[] = process.env.GITHUB_TOKEN
    ? await github(`/issues?labels=${LABEL},${APPROVED}&state=open&per_page=50&sort=created&direction=asc`)
    : [];
  if (!process.env.GITHUB_TOKEN) console.warn("No GITHUB_TOKEN: skipping topic requests (only related topics will be built).");

  for (const issue of issues) {
    if (queue.length >= limit) break;
    const topic = issue.title.replace(/^solicitud:\s*/i, "").trim();
    const existing = findExisting(entries, topic);
    if (existing) {
      await closeIssue(issue.number, `Ya existe en MyNurseDex: [${existing.es.term}](${SITE}/concept/${existing.id})`);
      console.log(`  #${issue.number} "${topic}": already exists (${existing.id})`);
      continue;
    }
    const v = await classify(topic);
    if (!v) {
      console.warn(`  #${issue.number} "${topic}": couldn't classify, leaving it open`);
      continue;
    }
    if (!v.nursing) {
      await closeIssue(issue.number, `"${topic}" no parece un tema de enfermería, así que no se agregó.`);
      console.log(`  #${issue.number} "${topic}": not a nursing topic, closed`);
      continue;
    }
    const sameAs = findExisting(entries, v.term_en);
    if (sameAs) {
      await closeIssue(issue.number, `Ya existe en MyNurseDex: [${sameAs.es.term}](${SITE}/concept/${sameAs.id})`);
      console.log(`  #${issue.number} "${topic}": already exists as ${sameAs.id}`);
      continue;
    }
    const id = slugify(v.term_en);
    if (taken.has(id)) continue;
    taken.add(id);
    queue.push({ id, category: v.category, term: v.term_en, areas: v.area ? [v.area] : [], issue: issue.number });
    console.log(`  #${issue.number} "${topic}" → ${v.category}: ${v.term_en}${v.area ? ` [${v.area}]` : ""}`);
  }

  // 2. Planned topics from data/topics.txt that don't exist yet (except hand-written "manual" ones).
  const ids = new Set(entries.map((e) => e.id));
  const topics = await readTopics();
  for (const t of topics) {
    if (queue.length >= limit) break;
    if (t.manual || ids.has(t.id) || taken.has(t.id)) continue;
    taken.add(t.id);
    queue.push(t);
    console.log(`  planned → ${t.category}: ${t.term}`);
  }

  // 3. Fill the rest with related topics that entries already point to (never ones in topics.txt).
  for (const t of topics) taken.add(t.id);
  const counts = new Map<string, { n: number; areas: Set<string> }>();
  for (const e of entries) {
    for (const r of e.related ?? []) {
      if (ids.has(r) || taken.has(r)) continue;
      const c = counts.get(r) ?? { n: 0, areas: new Set<string>() };
      c.n++;
      (e.areas ?? []).forEach((a) => c.areas.add(a));
      counts.set(r, c);
    }
  }
  // Most-linked first: those fill the biggest gaps.
  const backlog = [...counts.entries()].sort((a, b) => b[1].n - a[1].n);
  for (const [rid, info] of backlog) {
    if (queue.length >= limit) break;
    if (findExisting(entries, rid.replace(/-/g, " "))) continue;
    const v = await classify(rid.replace(/-/g, " "));
    if (!v?.nursing) continue;
    const id = slugify(v.term_en);
    if (ids.has(id) || taken.has(id) || findExisting(entries, v.term_en)) continue;
    taken.add(id);
    // Keep the id the other entries link to, so the "related" links start working.
    queue.push({ id: rid, category: v.category, term: v.term_en, areas: v.area ? [v.area] : [...info.areas] });
    console.log(`  related (${info.n} links) → ${v.category}: ${v.term_en}`);
  }
  return queue;
}
