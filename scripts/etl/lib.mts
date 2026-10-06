/* eslint-disable @typescript-eslint/no-explicit-any -- responses from external APIs are untyped JSON */
// Shared config, types and helpers for the ETL pipeline.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

export const CATEGORIES = ["pharmacology", "conditions", "labs", "fundamentals", "abbreviations"];
export const DATA_DIR = new URL("../../data/", import.meta.url);
export const RAW_DIR = new URL("raw/", DATA_DIR);
export const OPENSTAX_DIR = new URL("openstax/", RAW_DIR);

// ---------- Types (mirror src/lib/types.ts) ----------

export type Source = {
  name: string;
  publisher: string;
  url: string;
  lang: "en" | "es";
  license?: { name: string; url: string };
};

// What EXTRACT saves: everything fetched for one topic, before any AI.
export type RawRecord = {
  id: string;
  category: string;
  areas: string[];
  term: string;
  fetched_at: string;
  drug_class?: string;
  aliases: string[];
  sources: (Source & { text: string })[];
};

export type CarePlan = {
  diagnosis: string;
  type: "actual" | "risk";
  related_to: string[];
  evidenced_by: string[];
  outcomes: string[];
  interventions: { action: string; rationale: string }[];
};

export type Localized = {
  term: string;
  aliases: string[];
  summary: string;
  key_points: string[];
  sections: Record<string, string[]>;
  care_plans: CarePlan[];
};

export type Concept = {
  id: string;
  category: string;
  areas: string[];
  es: Localized;
  en: Localized;
  related: string[];
  sources: Source[];
  ai_drafted: boolean;
  verified: boolean;
  updated: string;
};

// manual: written by hand (in a Claude session), so the nightly job leaves it alone.
export type Job = { id: string; category: string; term: string; areas: string[]; manual?: boolean };

// ---------- Shared config files ----------

type SectionDef = { id: string; es: string; en: string; hint?: string };
export const SECTIONS: Record<string, { care_plans: number; sections: SectionDef[] }> = JSON.parse(
  await readFile(new URL("../../src/lib/sections.json", import.meta.url), "utf8"),
);

// Subject areas (courses), shared with the website (src/lib/areas.json).
export const AREAS: Record<string, { es: string; en: string; prompt: string }> = JSON.parse(
  await readFile(new URL("../../src/lib/areas.json", import.meta.url), "utf8"),
);

// Allowed NANDA-I labels (data/nanda.json). Models invent plausible-sounding diagnoses,
// so care plans must use one of these.
export const NANDA: { es: string; en: string }[] = JSON.parse(
  await readFile(new URL("nanda.json", DATA_DIR), "utf8"),
).diagnoses;
export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z: ]/g, "").trim();
export const nandaByEs = new Map(NANDA.map((d) => [norm(d.es), d]));

// ---------- Helpers ----------

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const today = () => new Date().toISOString().slice(0, 10);

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function clip(s: string | undefined, max: number): string {
  if (!s) return "";
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getJson(url: string): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status < 500) return null;
    } catch {
      // network hiccup: retry
    }
    await sleep(1000 * (attempt + 1));
  }
  return null;
}

export async function readJson<T>(url: URL): Promise<T | null> {
  try {
    return JSON.parse(await readFile(url, "utf8")) as T;
  } catch {
    return null;
  }
}

export async function writeJson(url: URL, data: unknown) {
  await mkdir(new URL("./", url), { recursive: true });
  await writeFile(url, JSON.stringify(data, null, 2) + "\n");
}

export const entryUrl = (category: string, id: string) => new URL(`${category}/${id}.json`, DATA_DIR);
export const rawUrl = (category: string, id: string) => new URL(`${category}/${id}.json`, RAW_DIR);

export async function loadEntries(): Promise<Concept[]> {
  const all: Concept[] = [];
  for (const c of CATEGORIES) {
    const dir = new URL(`${c}/`, DATA_DIR);
    await mkdir(dir, { recursive: true });
    for (const f of (await readdir(dir)).filter((f) => f.endsWith(".json"))) {
      all.push(JSON.parse(await readFile(new URL(f, dir), "utf8")));
    }
  }
  return all;
}

// topics.txt: "category: term" lines. A "[...]" header applies to the lines below it until the
// next header: an area (e.g. "[obstetrics]") tags them, and "manual" (e.g. "[obstetrics, manual]")
// marks them as hand-written so the nightly job skips them. "[]" clears both.
export async function readTopics(): Promise<Job[]> {
  let areas: string[] = [];
  let manual = false;
  const jobs: Job[] = [];
  for (const raw of (await readFile(new URL("topics.txt", DATA_DIR), "utf8")).split("\n")) {
    const l = raw.trim();
    if (!l || l.startsWith("#")) continue;
    const header = l.match(/^\[(.*)\]$/);
    if (header) {
      const parts = header[1].split(",").map((p) => p.trim()).filter(Boolean);
      manual = parts.includes("manual");
      areas = parts.filter((p) => p !== "manual");
      for (const a of areas) {
        if (!AREAS[a]) console.warn(`Unknown area "[${a}]" in topics.txt (add it to src/lib/areas.json)`);
      }
      areas = areas.filter((a) => AREAS[a]);
      continue;
    }
    const [category, ...rest] = l.split(":");
    const c = category.trim().toLowerCase();
    const term = rest.join(":").trim();
    if (!CATEGORIES.includes(c) || !term) {
      console.warn(`Skipping bad line in topics.txt: "${l}"`);
      continue;
    }
    jobs.push({ id: slugify(term), category: c, term, areas, manual });
  }
  return jobs;
}
