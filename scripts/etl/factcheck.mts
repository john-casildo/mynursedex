/* eslint-disable @typescript-eslint/no-explicit-any -- responses from external APIs are untyped JSON */
// FACT-CHECK: checks every claim in an entry against the FULL text of its cited sources.
//
//   1. Claims: each summary sentence, key point and section bullet (English version; the Spanish
//      text has the same structure, so results apply to both). Care plans are left out.
//   2. Evidence: the full source texts (OpenStax chapter from the local book cache, the complete
//      FDA label, the MedlinePlus page) are split into passages; the best-matching ones per claim
//      are picked by word overlap.
//   3. Judge: a different model family from the writer (Qwen by default) labels each claim
//      supported / not_found / contradicted and must quote the source sentence.
//   4. Deterministic guards: the quote must really appear in the source text, and every number in
//      the claim must appear in the quote; otherwise the claim is downgraded to not_found.
//
// Results are stored in entry.factcheck and shown on the entry page (✓ / ⚠ per point).

import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import { OPENSTAX_DIR, RAW_DIR, getJson, htmlToText, readJson, sleep, today, writeJson, type Concept, type Source } from "./lib.mts";
import { groq } from "./transform.mts";

export const FACTCHECK_MODEL = process.env.GROQ_FACTCHECK_MODEL ?? "qwen/qwen3.8-27b";
const FALLBACK_MODEL = "openai/gpt-oss-20b";
const CACHE_DIR = new URL("fulltext/", RAW_DIR);
const CLAIMS_PER_CALL = 6;
const PASSAGES_PER_CLAIM = 3;

export type ClaimResult = { status: "supported" | "not_found" | "contradicted"; quote?: string; source?: number };
export type FactCheck = {
  checked: string;
  model: string;
  counts: { supported: number; not_found: number; contradicted: number; total: number };
  claims: Record<string, ClaimResult>;
};

// ---------- Source texts (cached in data/raw/fulltext/, git-ignored) ----------

let books: { slug: string; pages: { slug: string; text: string }[] }[] | null = null;
async function openstaxText(url: string): Promise<string> {
  const m = url.match(/books\/([^/]+)\/pages\/([^/?#]+)/);
  if (!m) return "";
  if (!books) {
    books = [];
    for (const f of await readdir(OPENSTAX_DIR).catch(() => [] as string[])) {
      const pages = (await readJson<{ bookSlug: string; slug: string; text: string }[]>(new URL(f, OPENSTAX_DIR))) ?? [];
      if (pages.length) books.push({ slug: pages[0].bookSlug, pages });
    }
  }
  return books.find((b) => b.slug === m[1])?.pages.find((p) => p.slug === m[2])?.text ?? "";
}

async function dailymedText(url: string): Promise<string> {
  const setid = url.match(/setid=([0-9a-f-]+)/i)?.[1];
  if (!setid) return "";
  const data = await getJson(`https://api.fda.gov/drug/label.json?search=set_id:"${setid}"&limit=1`);
  const label = data?.results?.[0];
  if (!label) return "";
  const skip = new Set(["openfda", "package_label_principal_display_panel", "spl_product_data_elements", "set_id", "id", "version", "effective_time"]);
  return Object.entries(label)
    .filter(([k, v]) => !skip.has(k) && Array.isArray(v))
    .map(([, v]) => (v as string[]).join(" "))
    .join("\n");
}

async function medlineText(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const html = await res.text();
    const main = html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html;
    return htmlToText(main);
  } catch {
    return "";
  }
}

async function sourceText(s: Source): Promise<string> {
  if (s.lang !== "en") return ""; // claims are checked in English
  const file = new URL(`${createHash("sha1").update(s.url).digest("hex")}.json`, CACHE_DIR);
  const cached = await readJson<{ text: string }>(file);
  if (cached) return cached.text;
  let text = "";
  if (s.url.includes("openstax.org")) text = await openstaxText(s.url);
  else if (s.url.includes("dailymed")) text = await dailymedText(s.url);
  else if (s.url.includes("medlineplus.gov")) text = await medlineText(s.url);
  if (text) await writeJson(file, { url: s.url, text });
  return text;
}

// ---------- Claims and passage retrieval ----------

type Claim = { path: string; text: string };

function claimsOf(e: Concept): Claim[] {
  const out: Claim[] = [];
  e.en.summary
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 15)
    .forEach((text, i) => out.push({ path: `summary.${i}`, text }));
  e.en.key_points.forEach((text, i) => out.push({ path: `key_points.${i}`, text }));
  for (const [id, items] of Object.entries(e.en.sections ?? {})) {
    items.forEach((text, i) => out.push({ path: `sections.${id}.${i}`, text }));
  }
  return out;
}

const STOP = new Set(
  "the and for are with that this from into when than then they them their its can may not but has have was were will should also more most such each other over under only very before after while used use uses using who what which been being does per".split(" "),
);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const tokens = (s: string) =>
  norm(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map((w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w));

type Passage = { text: string; source: number; words: Set<string> };

function passagesOf(text: string, source: number): Passage[] {
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
  const out: Passage[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const chunk = sentences.slice(i, i + 2).join(" ");
    if (chunk.length > 40) out.push({ text: chunk.slice(0, 450), source, words: new Set(tokens(chunk)) });
  }
  return out;
}

function bestPassages(claim: string, passages: Passage[]): Passage[] {
  const words = [...new Set(tokens(claim))];
  const df = new Map<string, number>();
  for (const w of words) df.set(w, passages.filter((p) => p.words.has(w)).length);
  return passages
    .map((p) => ({
      p,
      score: words.reduce((sum, w) => sum + (p.words.has(w) ? Math.log(1 + passages.length / (1 + (df.get(w) ?? 0))) : 0), 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, PASSAGES_PER_CLAIM)
    .map((x) => x.p);
}

// ---------- Judge ----------

const JUDGE_PROMPT = `You fact-check a nursing study reference against its sources.
For each CLAIM you get EVIDENCE passages taken from the cited sources. Decide:
- "supported": the evidence clearly states the same thing (numbers must match).
- "contradicted": the evidence clearly states something incompatible.
- "not_found": the evidence doesn't address it, or only partly.
Be strict: general nursing knowledge that isn't in the evidence is "not_found".
For "supported" and "contradicted", "quote" must be ONE sentence copied EXACTLY, character for character, from the evidence.
Return ONLY JSON: {"results":[{"i": claim number, "status": "supported"|"not_found"|"contradicted", "quote": "..."}]}`;

async function judge(batch: { claim: Claim; passages: Passage[] }[]): Promise<any[]> {
  const user = batch
    .map(
      (b, i) =>
        `CLAIM ${i}: ${b.claim.text}\nEVIDENCE:\n${b.passages.length ? b.passages.map((p) => `- ${p.text}`).join("\n") : "- (none found)"}`,
    )
    .join("\n\n");
  for (const model of [FACTCHECK_MODEL, FALLBACK_MODEL]) {
    try {
      const data = await groq("/chat/completions", {
        model,
        temperature: 0,
        max_completion_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: JUDGE_PROMPT },
          { role: "user", content: user },
        ],
      });
      const out = JSON.parse(data.choices[0].message.content);
      return Array.isArray(out.results) ? out.results : [];
    } catch (err) {
      console.warn(`  judge (${model}) failed: ${(err as Error).message.slice(0, 120)}`);
    }
  }
  return [];
}

const squash = (s: string) => norm(s).replace(/[^a-z0-9]+/g, " ").trim();
const numbersIn = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "."));

// ---------- Fact-check one entry ----------

export async function factcheck(e: Concept): Promise<FactCheck> {
  const texts = await Promise.all(e.sources.map(sourceText));
  const passages = texts.flatMap((t, i) => (t ? passagesOf(t, i) : []));
  const fullText = squash(texts.join(" "));
  const claims = claimsOf(e);
  const results: Record<string, ClaimResult> = {};

  for (let i = 0; i < claims.length; i += CLAIMS_PER_CALL) {
    const batch = claims.slice(i, i + CLAIMS_PER_CALL).map((claim) => ({ claim, passages: bestPassages(claim.text, passages) }));
    const verdicts = batch.every((b) => b.passages.length === 0) ? [] : await judge(batch);
    batch.forEach((b, j) => {
      const v = verdicts.find((x) => Number(x?.i) === j);
      let status: ClaimResult["status"] = ["supported", "contradicted"].includes(v?.status) ? v.status : "not_found";
      const quote = typeof v?.quote === "string" ? v.quote.trim() : "";
      // Guard 1: the quote must really be in the sources (no invented evidence).
      if (status !== "not_found" && (!quote || !fullText.includes(squash(quote)))) status = "not_found";
      // Guard 2: every number in a "supported" claim must appear in the quote.
      if (status === "supported") {
        const qn = new Set(numbersIn(quote));
        if (numbersIn(b.claim.text).some((n) => !qn.has(n))) status = "not_found";
      }
      const source = status === "not_found" ? undefined : b.passages.find((p) => squash(p.text).includes(squash(quote).slice(0, 40)))?.source;
      results[b.claim.path] = status === "not_found" ? { status } : { status, quote, ...(source !== undefined ? { source } : {}) };
    });
    await sleep(500);
  }

  const values = Object.values(results);
  return {
    checked: today(),
    model: FACTCHECK_MODEL,
    counts: {
      supported: values.filter((r) => r.status === "supported").length,
      not_found: values.filter((r) => r.status === "not_found").length,
      contradicted: values.filter((r) => r.status === "contradicted").length,
      total: values.length,
    },
    claims: results,
  };
}
