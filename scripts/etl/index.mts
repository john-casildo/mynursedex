// MyNurseDex ETL: builds entries from official/open sources.
//
//   npm run etl -- sync-books                 # one-time: download OpenStax nursing books (~20 MB, few min)
//   npm run etl -- run                        # extract + transform + validate every new topic in data/topics.txt
//   npm run etl -- run --upgrade              # redo existing entries that aren't in the full format yet
//   npm run etl -- run --upgrade --force      # redo ALL existing entries
//   npm run etl -- extract                    # only fetch sources into data/raw/ (no AI)
//   npm run etl -- transform                  # only redo AI drafts from saved data/raw/ (no re-fetching)
//   npm run etl -- validate                   # check every entry (also runs before each build)
//   npm run etl -- factcheck --limit 8        # check entries' claims against their sources' full text
//   npm run etl -- queue --limit 10           # nightly job: topic requests (GitHub issues) + missing related topics
//   npm run etl -- close-issues               # nightly job: close the requests built by queue (after the push)
//
// Options: --only <id> one entry | --area <area> one area | --limit <n> at most n entries
//          --dry-run print instead of saving
//
// Groq free plan: ~8,000 tokens/minute and ~200,000 tokens/day per model. Each entry uses about
// 7k tokens on the drafting model and 6k on the translation model, so roughly 25 entries/day. Every step saves as it goes and skips finished work, so it's safe to stop and re-run.

import { appendFile, readFile } from "node:fs/promises";
import { entryUrl, loadEntries, rawUrl, readJson, readTopics, writeJson, type Concept, type Job, type RawRecord } from "./lib.mts";
import { extract } from "./extract.mts";
import { hasOpenStax, syncOpenStax } from "./openstax.mts";
import { MODEL, TRANSLATE_MODEL, groq, transform } from "./transform.mts";
import { buildQueue, closeIssue, type QueueItem } from "./queue.mts";
import { checkEntry, printReport, validate } from "./validate.mts";
import { FACTCHECK_MODEL, factcheck } from "./factcheck.mts";

const args = process.argv.slice(2);
const command =
  args.find((a, i) => !a.startsWith("--") && !["--only", "--area", "--limit"].includes(args[i - 1])) ?? "run";
const FORCE = args.includes("--force");
const DRY_RUN = args.includes("--dry-run");
const UPGRADE = args.includes("--upgrade");
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;
const AREA = args.includes("--area") ? args[args.indexOf("--area") + 1] : undefined;
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : undefined;

// An entry is "full" once it has sections beyond nursing care and the new sources list.
const isFull = (e: Concept) =>
  Array.isArray(e.sources) && Object.keys(e.es.sections ?? {}).some((k) => k !== "nursing_care");

async function jobs(): Promise<Job[]> {
  const existing = await loadEntries();
  const byId = new Map(existing.map((e) => [e.id, e]));
  let list: Job[];
  if (UPGRADE || command === "transform") {
    list = existing
      .filter((e) => FORCE || command === "transform" || !isFull(e))
      .map((e) => ({
        id: e.id,
        category: e.category,
        term: e.en.term.replace(/\s*\(.*?\)/g, ""),
        areas: e.areas ?? [],
      }));
  } else {
    list = (await readTopics()).filter((t) => FORCE || !byId.has(t.id));
  }
  if (ONLY) list = list.filter((j) => j.id === ONLY);
  if (AREA) list = list.filter((j) => j.areas.includes(AREA));
  return LIMIT ? list.slice(0, LIMIT) : list;
}

// The model sometimes returns broken JSON or an empty entry. Retry, and never save an entry
// that fails validation: the previous version (if any) stays in place.
async function transformChecked(raw: RawRecord, tries = 3): Promise<Concept | null> {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const entry = await transform(raw);
      const { errors } = checkEntry(entry, raw.category, raw.id);
      if (!errors.length) return entry;
      console.warn(`  attempt ${attempt}: invalid entry (${errors.slice(0, 2).join("; ")})`);
    } catch (err) {
      console.warn(`  attempt ${attempt}: ${(err as Error).message.slice(0, 160)}`);
    }
  }
  console.error(`  failed after ${tries} tries; keeping the previous version`);
  return null;
}

async function checkGroq() {
  if (!process.env.GROQ_API_KEY) {
    console.error("Missing GROQ_API_KEY. Add it to .env.local (see console.groq.com > API Keys).");
    process.exit(1);
  }
  const ids: string[] = (await groq("/models")).data.map((m: { id: string }) => m.id);
  for (const [name, model] of [["GROQ_MODEL", MODEL], ["GROQ_TRANSLATE_MODEL", TRANSLATE_MODEL]]) {
    if (!ids.includes(model)) {
      console.error(`Model "${model}" isn't available on Groq. Set ${name} in .env.local to one of:\n  ${ids.join("\n  ")}`);
      process.exit(1);
    }
  }
}

async function main() {
  if (command === "validate") {
    const report = await validate();
    printReport(report, true);
    process.exit(report.errors.length ? 1 : 0);
  }
  if (command === "close-issues") {
    const file = process.env.CLOSE_LATER_FILE;
    const lines = file ? (await readFile(file, "utf8").catch(() => "")).split("\n").filter(Boolean) : [];
    for (const line of lines) {
      const { issue, comment } = JSON.parse(line);
      await closeIssue(issue, comment);
      console.log(`Closed request #${issue}`);
    }
    return;
  }
  if (command === "factcheck") {
    if (!process.env.GROQ_API_KEY) {
      console.error("Missing GROQ_API_KEY. Add it to .env.local (see console.groq.com > API Keys).");
      process.exit(1);
    }
    // Unchecked entries, or ones changed since their last check; newest first.
    let todo = (await loadEntries()).filter((e) => FORCE || !e.factcheck || e.factcheck.checked < e.updated);
    if (ONLY) todo = todo.filter((e) => e.id === ONLY);
    todo.sort((a, b) => b.updated.localeCompare(a.updated));
    if (LIMIT) todo = todo.slice(0, LIMIT);
    console.log(`Fact-checking ${todo.length} entr${todo.length === 1 ? "y" : "ies"} with ${FACTCHECK_MODEL}...\n`);
    for (const e of todo) {
      try {
        const fc = await factcheck(e);
        const c = fc.counts;
        console.log(`  ${e.id}: ${c.supported}/${c.total} supported, ${c.contradicted} contradicted, ${c.not_found} not found`);
        for (const [path, r] of Object.entries(fc.claims)) {
          if (r.status === "contradicted") console.log(`    ⚠ ${path}: "${r.quote}"`);
        }
        if (!DRY_RUN) await writeJson(entryUrl(e.category, e.id), { ...e, factcheck: fc });
      } catch (err) {
        console.error(`  ${e.id}: failed (${(err as Error).message.slice(0, 120)})`);
      }
    }
    return;
  }
  if (command === "sync-books") {
    console.log("Downloading OpenStax nursing books...");
    await syncOpenStax(FORCE);
    return;
  }
  if (!["run", "extract", "transform", "queue"].includes(command)) {
    console.error(`Unknown command "${command}". Use: sync-books, run, extract, transform, validate, queue.`);
    process.exit(1);
  }

  if (command !== "transform" && !(await hasOpenStax())) {
    console.warn("⚠ OpenStax books not downloaded, so they won't be used. Run: npm run etl -- sync-books\n");
  }
  if (command !== "extract") await checkGroq();

  let work: QueueItem[];
  if (command === "queue") {
    console.log("Building tonight's queue...");
    work = await buildQueue(await loadEntries(), LIMIT ?? 10);
    console.log("");
  } else {
    work = await jobs();
  }
  console.log(`${work.length} entr${work.length === 1 ? "y" : "ies"} to ${command}.\n`);
  let done = 0;
  for (const [i, job] of work.entries()) {
    console.log(`→ [${i + 1}/${work.length}] ${job.category}: ${job.term}`);
    try {
      let raw: RawRecord | null = null;
      if (command === "transform") {
        raw = await readJson<RawRecord>(rawUrl(job.category, job.id));
        if (!raw) {
          console.warn("  no saved raw data; run extract first");
          continue;
        }
      } else {
        raw = await extract(job);
        console.log(`  sources: ${raw.sources.map((s) => s.name).join(" · ") || "none"}`);
      }
      if (command !== "extract") {
        const entry = await transformChecked(raw);
        if (!entry) continue;
        if (DRY_RUN) console.log(JSON.stringify(entry, null, 2));
        else {
          await writeJson(entryUrl(entry.category, entry.id), entry);
          if (job.issue) {
            const comment = `Agregado a MyNurseDex: [${entry.es.term}](${process.env.SITE_URL ?? "https://mynursedex.vercel.app"}/concept/${entry.id}). Estará disponible en unos minutos.`;
            // In CI, requests are closed only after the new entries are pushed (see close-issues).
            if (process.env.CLOSE_LATER_FILE) {
              await appendFile(process.env.CLOSE_LATER_FILE, JSON.stringify({ issue: job.issue, comment }) + "\n");
            } else {
              await closeIssue(job.issue, comment);
            }
          }
        }
      }
      done++;
    } catch (err) {
      console.error(`  failed: ${(err as Error).message}`);
    }
  }
  console.log(`\n${done}/${work.length} done${DRY_RUN ? " (dry run, nothing saved)" : ""}.`);

  if (command !== "extract" && !DRY_RUN) {
    console.log("");
    printReport(await validate());
  }
}

main();
