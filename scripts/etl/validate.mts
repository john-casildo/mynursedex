// VALIDATE: checks every entry in data/ before it can reach the website.
// Runs automatically before `npm run build` (prebuild), so a broken entry stops the deploy.
//
//   npm run validate
//
// Errors fail the build. Warnings are printed but allowed (e.g. a related topic not imported yet).

import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AREAS, CATEGORIES, DATA_DIR, NANDA, SECTIONS, norm, nandaByEs, readJson, type Concept, type Localized } from "./lib.mts";

type Problem = { file: string; message: string };

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

function checkLocalized(t: Localized | undefined, lang: string, category: string, err: (m: string) => void) {
  if (!t) return err(`missing "${lang}" text`);
  if (!t.term?.trim()) err(`${lang}.term is empty`);
  if (!t.summary?.trim()) err(`${lang}.summary is empty`);
  if (!isStrings(t.aliases)) err(`${lang}.aliases must be a list of text`);
  if (!isStrings(t.key_points) || t.key_points.length === 0) err(`${lang}.key_points is empty`);
  if (!t.sections || typeof t.sections !== "object") return err(`${lang}.sections is missing`);
  const known = new Set(SECTIONS[category]?.sections.map((s) => s.id));
  for (const [id, items] of Object.entries(t.sections)) {
    if (!known.has(id)) err(`${lang}.sections.${id} isn't a section for ${category} (see src/lib/sections.json)`);
    if (!isStrings(items)) err(`${lang}.sections.${id} must be a list of text`);
  }
  if (!Array.isArray(t.care_plans)) return err(`${lang}.care_plans must be a list`);
  for (const p of t.care_plans) {
    if (!p.diagnosis) err(`${lang}: care plan without a diagnosis`);
    if (p.type !== "actual" && p.type !== "risk") err(`${lang}: care plan "${p.diagnosis}" has an invalid type`);
    if (!Array.isArray(p.interventions) || p.interventions.some((iv) => !iv.action)) {
      err(`${lang}: care plan "${p.diagnosis}" has an intervention without an action`);
    }
  }
}

const nandaEn = new Set(NANDA.map((d) => norm(d.en)));

// Checks one entry. Used by `validate` and by the ETL before it saves anything.
export function checkEntry(e: Concept, category: string, fileId: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => errors.push(m);
  if (e.id !== fileId) err(`id "${e.id}" doesn't match the file name`);
  if (e.category !== category) err(`category "${e.category}" doesn't match the folder "${category}"`);
  if (typeof e.verified !== "boolean") err(`"verified" must be true or false`);
  for (const a of e.areas ?? []) {
    if (!AREAS[a]) err(`area "${a}" isn't defined in src/lib/areas.json`);
  }
  if (!Array.isArray(e.sources)) err(`"sources" must be a list`);
  else {
    for (const s of e.sources) {
      if (!s.name || !/^https:\/\//.test(s.url ?? "")) err(`source "${s.name}" needs a name and an https link`);
    }
    if (e.sources.length === 0) warnings.push("no sources (AI knowledge only)");
  }
  checkLocalized(e.es, "es", category, err);
  checkLocalized(e.en, "en", category, err);

  // Care plans: diagnoses must be on the NANDA list, and both languages must line up.
  for (const p of e.es?.care_plans ?? []) {
    if (!nandaByEs.has(norm(p.diagnosis))) err(`es diagnosis "${p.diagnosis}" isn't in data/nanda.json`);
  }
  for (const p of e.en?.care_plans ?? []) {
    if (!nandaEn.has(norm(p.diagnosis))) err(`en diagnosis "${p.diagnosis}" isn't in data/nanda.json`);
  }
  const contradicted = (e as Concept & { factcheck?: { counts?: { contradicted?: number } } }).factcheck?.counts?.contradicted ?? 0;
  if (contradicted > 0) warnings.push(`fact-check: ${contradicted} point(s) contradicted by the sources — review them`);
  if ((e.es?.care_plans?.length ?? 0) !== (e.en?.care_plans?.length ?? 0)) {
    warnings.push("Spanish and English have a different number of care plans");
  }
  return { errors, warnings };
}

export async function validate(): Promise<{ errors: Problem[]; warnings: Problem[]; count: number }> {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  const entries: { file: string; e: Concept }[] = [];

  for (const category of CATEGORIES) {
    let files: string[] = [];
    try {
      files = (await readdir(new URL(`${category}/`, DATA_DIR))).filter((f) => f.endsWith(".json"));
    } catch {
      continue;
    }
    for (const f of files) {
      const file = `data/${category}/${f}`;
      const e = await readJson<Concept>(new URL(`${category}/${f}`, DATA_DIR));
      if (!e) {
        errors.push({ file, message: "isn't valid JSON" });
        continue;
      }
      const result = checkEntry(e, category, f.replace(/\.json$/, ""));
      errors.push(...result.errors.map((message) => ({ file, message })));
      warnings.push(...result.warnings.map((message) => ({ file, message })));
      entries.push({ file, e });
    }
  }

  const ids = new Map<string, string>();
  for (const { file, e } of entries) {
    if (ids.has(e.id)) errors.push({ file, message: `duplicate id, also used by ${ids.get(e.id)}` });
    ids.set(e.id, file);
  }
  for (const { file, e } of entries) {
    const missing = (e.related ?? []).filter((r) => !ids.has(r));
    if (missing.length) warnings.push({ file, message: `related topics not in MyNurseDex yet: ${missing.join(", ")}` });
  }

  return { errors, warnings, count: entries.length };
}

export function printReport({ errors, warnings, count }: Awaited<ReturnType<typeof validate>>, verbose = false) {
  if (verbose) for (const w of warnings) console.log(`  ⚠ ${w.file}: ${w.message}`);
  for (const e of errors) console.log(`  ✖ ${e.file}: ${e.message}`);
  console.log(
    `Validated ${count} entries: ${errors.length} error${errors.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}${!verbose && warnings.length ? " (run `npm run validate -- --verbose` to see them)" : ""}.`,
  );
}

// Run directly: `node scripts/etl/validate.mts`
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = await validate();
  printReport(report, process.argv.includes("--verbose"));
  if (report.errors.length) process.exit(1);
}
