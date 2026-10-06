// Server-only helpers for "Pregúntale a MyNurseDex": find the entries that match a question and
// turn them into the context the model is allowed to answer from.
import Fuse from "fuse.js";
import { SECTIONS } from "./categories";
import { entries, getEntry } from "./concepts";
import type { DexEntry, Lang } from "./types";

const fuse = new Fuse(entries, {
  keys: [
    { name: "es.term", weight: 3 },
    { name: "en.term", weight: 3 },
    { name: "es.aliases", weight: 2 },
    { name: "en.aliases", weight: 2 },
    { name: "es.summary", weight: 0.5 },
    { name: "en.summary", weight: 0.5 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
  ignoreDiacritics: true,
  includeScore: true,
});

// Words that say nothing about the topic.
const STOPWORDS = new Set(
  (
    "que qué cual cuál como cómo cuando cuándo donde dónde por porque para con sin sobre entre una uno unos unas los las del " +
    "esta este esto estos estas ese esa eso hay hace hacer puede pueden debe deben tiene tienen más menos muy pero también " +
    "paciente pacientes enfermera enfermería explica explícame dime quiero saber cuales cuáles se le lo la el en es son " +
    "what which when where why how does should could would with without about from into this that these those there have " +
    "patient patients nurse nursing explain tell want know the and for are can"
  ).split(" "),
);

function keywords(question: string): string[] {
  return [
    ...new Set(
      question
        .toLowerCase()
        .split(/[^a-záéíóúüñ0-9+-]+/i)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
    ),
  ];
}

// Best-matching entries: the current entry first (if any), then the highest-scoring matches
// across the question's keywords and adjacent keyword pairs.
export function findEntries(question: string, entryId?: string, max = 3): DexEntry[] {
  const scores = new Map<string, number>();
  const words = keywords(question);
  const queries = [...words, ...words.slice(1).map((w, i) => `${words[i]} ${w}`)];
  for (const q of queries) {
    for (const r of fuse.search(q, { limit: 5 })) {
      const s = 1 - (r.score ?? 1);
      scores.set(r.item.id, (scores.get(r.item.id) ?? 0) + s * (q.includes(" ") ? 1.5 : 1));
    }
  }
  const ranked = [...scores.entries()]
    .filter(([, s]) => s >= 0.6)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => getEntry(id)!)
    .filter(Boolean);
  const current = entryId ? getEntry(entryId) : undefined;
  return [...(current ? [current] : []), ...ranked.filter((e) => e.id !== current?.id)].slice(0, max);
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

// Plain-text version of an entry in one language, short enough to fit the free plan's limits.
export function entryContext(e: DexEntry, lang: Lang, maxChars = 2200): string {
  const t = e[lang];
  const parts = [`### ${t.term}`, t.summary, "", ...t.key_points.map((p) => `- ${p}`)];
  for (const s of SECTIONS[e.category].sections) {
    const items = t.sections[s.id];
    if (items?.length) parts.push(`${s[lang]}: ${items.join("; ")}`);
  }
  for (const p of t.care_plans) {
    parts.push(`NANDA: ${p.diagnosis} — ${p.interventions.map((iv) => iv.action).join("; ")}`);
  }
  return clip(parts.join("\n"), maxChars);
}

export type AskMode = "ask" | "simpler" | "example" | "quiz";

const BASE = {
  es: `Eres MyNurseDex, tutor de enfermería para una estudiante de segundo año en Costa Rica.
Responde en español de Costa Rica, claro y breve (máximo unas 200 palabras), usando SOLO la información de las ENTRADAS.
Si la respuesta no está en las entradas, dilo claramente ("Eso aún no está en MyNurseDex") y no inventes.
Nunca agregues cifras, frecuencias, rangos ni datos que no aparezcan textualmente en las entradas.
No des dosis ni indicaciones para pacientes reales: para decisiones clínicas, remite a la docente y al protocolo del centro.
Usa viñetas cuando ayuden y **negrita** para lo más importante. Al final, menciona entre corchetes las entradas que usaste, p. ej. [Preeclampsia].`,
  en: `You are MyNurseDex, a nursing tutor for a second-year nursing student.
Answer in clear, short English (about 200 words max), using ONLY the information in the ENTRIES.
If the answer isn't in the entries, say so clearly ("That isn't in MyNurseDex yet") and don't make anything up.
Never add numbers, frequencies, ranges or facts that don't appear in the entries.
Don't give doses or orders for real patients: for clinical decisions, refer to the instructor and facility protocol.
Use bullets when they help and **bold** for the key facts. At the end, name the entries you used in brackets, e.g. [Preeclampsia].`,
};

const MODES: Record<Exclude<AskMode, "quiz">, Record<Lang, string>> = {
  ask: { es: "", en: "" },
  simpler: {
    es: "Explícalo de la forma más sencilla posible, como a alguien de primer año, con una analogía de la vida diaria.",
    en: "Explain it as simply as possible, as if to a first-year student, with an everyday analogy.",
  },
  example: {
    es: "Da un caso clínico breve y realista con una paciente ficticia, y explica paso a paso qué valora y qué hace la enfermera.",
    en: "Give a short, realistic clinical case with a fictional patient, and explain step by step what the nurse assesses and does.",
  },
};

export function systemPrompt(lang: Lang): string {
  return BASE[lang];
}

// The task for shortcut modes goes in the user message, where the model weighs it most.
export function modeTask(mode: Exclude<AskMode, "quiz">, lang: Lang): string {
  return MODES[mode][lang];
}

export function quizPrompt(lang: Lang): string {
  return lang === "es"
    ? `Eres MyNurseDex. Escribe 3 preguntas de selección única tipo examen de enfermería (en español de Costa Rica) basadas SOLO en las ENTRADAS.
Devuelve SOLO JSON: {"questions":[{"question": texto, "options": [4 opciones], "answer": índice 0-3 de la correcta, "rationale": por qué es correcta, 1-2 oraciones}]}.
Prioriza valoración, prioridades de enfermería y signos de alarma. Sin dosis.`
    : `You are MyNurseDex. Write 3 single-answer, exam-style nursing questions in English based ONLY on the ENTRIES.
Return ONLY JSON: {"questions":[{"question": text, "options": [4 options], "answer": index 0-3 of the correct one, "rationale": why it's correct, 1-2 sentences}]}.
Focus on assessment, nursing priorities and warning signs. No doses.`;
}
