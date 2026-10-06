/* eslint-disable @typescript-eslint/no-explicit-any -- model output is untyped JSON */
// TRANSFORM: turn a saved raw record into a full bilingual entry.
// Spanish is drafted from the sources, then translated to English (two calls, so each stays
// under Groq's free 8,000 tokens/minute), then cleaned and checked against the NANDA list.

import {
  AREAS,
  NANDA,
  SECTIONS,
  clip,
  nandaByEs,
  norm,
  slugify,
  sleep,
  today,
  type CarePlan,
  type Concept,
  type Localized,
  type RawRecord,
} from "./lib.mts";

const GROQ_URL = "https://api.groq.com/openai/v1";
export const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
const MAX_SOURCE_CHARS = 4500;
const MAX_OUTPUT_TOKENS = 4500;

// ---------- Groq ----------

export async function groq(path: string, body?: unknown): Promise<any> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${GROQ_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const wait = Math.ceil(Number(res.headers.get("retry-after") ?? 15));
      console.log(`  rate limited, waiting ${wait}s...`);
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
    return res.json();
  }
  throw new Error("Groq: still rate limited after 6 tries (daily limit reached? try again later)");
}

async function chatJson(system: string, user: string, effort: "low" | "medium"): Promise<any> {
  const data = await groq("/chat/completions", {
    model: MODEL,
    temperature: 0.2,
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    reasoning_effort: effort,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const choice = data.choices[0];
  if (choice.finish_reason === "length") throw new Error("response was cut off (too long)");
  const parsed = JSON.parse(choice.message.content);
  // Sometimes the model wraps the object in a one-item list.
  return Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
}

// ---------- Prompts ----------

function shapeFor(category: string): string {
  const def = SECTIONS[category];
  const sections = def.sections
    .map((s) => `    "${s.id}": [bullets]   // ${s.en}${s.hint ? ` (${s.hint})` : ""}`)
    .join("\n");
  const plans = def.care_plans
    ? `  "care_plans": [   // exactly ${def.care_plans}, the most relevant for this topic
    {
      "diagnosis": copied EXACTLY from the NANDA-I LIST below,
      "type": "risk" if the label starts with "Riesgo de", otherwise "actual",
      "related_to": [related factors; for "risk" diagnoses, the risk factors],
      "evidenced_by": [defining characteristics; empty [] for "risk"],
      "outcomes": [2-3 "NOC label: measurable goal", no codes],
      "interventions": [4-6 { "action": concrete NIC-style nursing action, "rationale": why, one sentence }]
    }
  ],`
    : `  "care_plans": [],`;
  return `{
  "term": display name,
  "aliases": [4-10 lowercase search words a student might type],
  "summary": 1-2 plain sentences,
  "key_points": [4-6 must-know exam points],
  "sections": {
${sections}
  },
${plans}
  "related": [3-6 related concept names IN ENGLISH, e.g. "hypokalemia", "heart failure"]
}`;
}

function draftPrompt(category: string): string {
  return `You write entries for NurseDex, a nursing study reference. The reader is a 2nd-year nursing student
in COSTA RICA whose classes and exams are in Spanish.
Write the entry IN SPANISH as used in Costa Rican nursing education ("presión arterial", "insuficiencia cardíaca"),
with generic drug names (DCI), metric units (kg, °C, mL) and lab units as reported in Costa Rica (glucose mg/dL, electrolytes mEq/L).
Return ONLY a JSON object with this shape:
${shapeFor(category)}
Rules:
- "term": drugs → generic name ("Furosemida"); conditions → common name with abbreviation ("Insuficiencia cardíaca (IC)").
- Each section: 3-6 short bullets (max ~20 words each). Use [] for a section that doesn't apply.
- Base facts on the SOURCES when provided. Add only well-established nursing-textbook knowledge.
- NANDA-I diagnoses MUST be copied exactly from the NANDA-I LIST below. NEVER include NANDA/NOC/NIC codes.
- No specific doses. Give commonly taught lab ranges and note they vary by lab.
- Only mention brand names you are confident are sold in Costa Rica.
- Be accurate. If unsure about a fact, leave it out.

NANDA-I LIST:
${NANDA.map((d) => d.es).join("\n")}`;
}

const TRANSLATE_PROMPT = `You translate NurseDex nursing entries from Spanish into English for reference.
Return ONLY a JSON object with exactly the same keys and structure as the input, all text in English.
Rules:
- Keep the same facts; do not add or remove content.
- Use the official English NOC/NIC labels (no codes).
- "term": drugs → "Generic (US Brand)" if a common US brand exists; conditions → "Name (ABBR)".
- "aliases": English search words a student might type (brand names, abbreviations, everyday words like "water pill").
- Keep metric units; you may add °F or lb in parentheses.`;

// ---------- Cleaning (the model's JSON isn't always exactly the right shape) ----------

const strings = (v: any): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()) : [];

function cleanCarePlan(raw: any): CarePlan | null {
  if (!raw || typeof raw.diagnosis !== "string") return null;
  const type = raw.type === "risk" ? "risk" : "actual";
  return {
    diagnosis: raw.diagnosis.trim(),
    type,
    related_to: strings(raw.related_to),
    evidenced_by: type === "risk" ? [] : strings(raw.evidenced_by),
    outcomes: strings(raw.outcomes),
    interventions: (Array.isArray(raw.interventions) ? raw.interventions : [])
      .map((iv: any) =>
        typeof iv === "string"
          ? { action: iv.trim(), rationale: "" }
          : { action: String(iv?.action ?? "").trim(), rationale: String(iv?.rationale ?? "").trim() },
      )
      .filter((iv: { action: string }) => iv.action),
  };
}

function cleanLocalized(raw: any, category: string, fallbackTerm: string, extraAliases: string[]): Localized {
  const sections: Record<string, string[]> = {};
  for (const s of SECTIONS[category].sections) {
    const items = strings(raw?.sections?.[s.id]);
    if (items.length) sections[s.id] = items;
  }
  return {
    term: typeof raw?.term === "string" && raw.term.trim() ? raw.term.trim() : fallbackTerm,
    aliases: [...strings(raw?.aliases), ...extraAliases]
      .map((a) => a.toLowerCase())
      .filter((a, i, arr) => arr.indexOf(a) === i)
      .slice(0, 12),
    summary: typeof raw?.summary === "string" ? raw.summary.trim() : "",
    key_points: strings(raw?.key_points),
    sections,
    care_plans: (Array.isArray(raw?.care_plans) ? raw.care_plans : [])
      .map(cleanCarePlan)
      .filter((p: CarePlan | null): p is CarePlan => p !== null),
  };
}

// Keep only care plans whose diagnosis is on the NANDA list, using the list's exact wording.
function enforceNanda(plans: CarePlan[]): CarePlan[] {
  return plans.flatMap((plan) => {
    const match = nandaByEs.get(norm(plan.diagnosis));
    if (!match) {
      console.warn(`  dropped care plan with non-NANDA diagnosis: "${plan.diagnosis}"`);
      return [];
    }
    const type = match.es.startsWith("Riesgo") ? "risk" : "actual";
    return [{ ...plan, diagnosis: match.es, type, evidenced_by: type === "risk" ? [] : plan.evidenced_by }];
  });
}

// ---------- Transform ----------

function sourcesForPrompt(raw: RawRecord): string {
  if (!raw.sources.length) return "SOURCES: (none found; use standard nursing-textbook knowledge only)";
  // Share the character budget across sources so one long label can't crowd out the rest.
  const each = Math.floor(MAX_SOURCE_CHARS / raw.sources.length);
  return "SOURCES:\n" + raw.sources.map((s) => `## ${s.name} (${s.lang})\n${clip(s.text, each)}`).join("\n\n");
}

export async function transform(raw: RawRecord): Promise<Concept> {
  const user = [
    `Category: ${raw.category}`,
    `Topic: ${raw.term}`,
    ...(raw.areas ?? []).map((a) => `Area: ${AREAS[a]?.prompt ?? a}. Focus the content and care plans on this context.`),
    raw.drug_class ? `FDA drug class: ${raw.drug_class}` : "",
    sourcesForPrompt(raw),
  ]
    .filter(Boolean)
    .join("\n\n");

  const esRaw = await chatJson(draftPrompt(raw.category), user, "medium");
  if (process.env.ETL_DEBUG) console.log(JSON.stringify(esRaw).slice(0, 1500));
  const es = cleanLocalized(esRaw, raw.category, raw.term, raw.aliases);
  es.care_plans = enforceNanda(es.care_plans);
  console.log(`  es: ${es.term} (${Object.keys(es.sections).length} sections, ${es.care_plans.length} care plans)`);

  const enRaw = await chatJson(TRANSLATE_PROMPT, JSON.stringify(es), "low");
  const en = cleanLocalized(enRaw, raw.category, raw.term, raw.aliases);
  // Use the official English label from nanda.json rather than the model's translation.
  if (en.care_plans.length === es.care_plans.length) {
    en.care_plans.forEach((plan, i) => {
      const d = es.care_plans[i];
      plan.diagnosis = nandaByEs.get(norm(d.diagnosis))!.en;
      plan.type = d.type;
      if (d.type === "risk") plan.evidenced_by = [];
    });
  } else {
    console.warn("  English care plans don't line up with the Spanish ones; dropping them");
    en.care_plans = [];
  }
  console.log(`  en: ${en.term}`);

  return {
    id: raw.id,
    category: raw.category,
    areas: raw.areas ?? [],
    es,
    en,
    related: strings(esRaw.related).map(slugify).filter((r) => r && r !== raw.id),
    sources: raw.sources.map((s) => ({
      name: s.name,
      publisher: s.publisher,
      url: s.url,
      lang: s.lang,
      ...(s.license ? { license: s.license } : {}),
    })),
    ai_drafted: true,
    verified: false,
    updated: today(),
  };
}
