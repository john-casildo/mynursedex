// Server-only: reads entries from data/<category>/<id>.json at build time.
// Client components must import from ./categories instead.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  CATEGORIES,
  type Concept,
  type DexEntry,
  type Localized,
  type SearchItem,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function loadAll(): Concept[] {
  return CATEGORIES.flatMap((category) => {
    const dir = path.join(DATA_DIR, category);
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Concept);
  });
}

// Dex numbers follow alphabetical order of the Spanish term.
export const entries: DexEntry[] = loadAll()
  .sort((a, b) => a.es.term.localeCompare(b.es.term, "es"))
  .map((c, i) => ({ ...c, number: i + 1 }));

const byId = new Map(entries.map((e) => [e.id, e]));

export function getEntry(id: string): DexEntry | undefined {
  return byId.get(id);
}

function slim(t: Localized) {
  return {
    term: t.term,
    aliases: t.aliases,
    summary: t.summary,
    // So searching a NANDA diagnosis finds the conditions and drugs that use it.
    diagnoses: t.care_plans.map((c) => c.diagnosis),
  };
}

// Only what the search page needs. Full entries load on their own concept pages,
// which keeps the home page small as the number of entries grows.
export function toSearchItem(e: DexEntry): SearchItem {
  return {
    id: e.id,
    number: e.number,
    category: e.category,
    es: slim(e.es),
    en: slim(e.en),
  };
}
