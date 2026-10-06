// NurseDex ETL: builds entries from official/open sources.
//
//   npm run etl -- sync-books                 # one-time: download OpenStax nursing books (~20 MB, few min)
//   npm run etl -- run                        # extract + transform + validate every new topic in data/topics.txt
//   npm run etl -- run --upgrade              # redo existing entries that aren't in the full format yet
//   npm run etl -- run --upgrade --force      # redo ALL existing entries
//   npm run etl -- extract                    # only fetch sources into data/raw/ (no AI)
//   npm run etl -- transform                  # only redo AI drafts from saved data/raw/ (no re-fetching)
//   npm run etl -- validate                   # check every entry (also runs before each build)
//
// Options: --only <id>   limit to one entry   |   --dry-run   print instead of saving
//
// Groq free plan: ~8,000 tokens/minute and 1,000 requests/day. Each entry uses 2 requests and
// about a minute. Every step saves as it goes and skips finished work, so it's safe to stop and re-run.

import { entryUrl, loadEntries, rawUrl, readJson, readTopics, writeJson, type Concept, type Job, type RawRecord } from "./lib.mts";
import { extract } from "./extract.mts";
import { hasOpenStax, syncOpenStax } from "./openstax.mts";
import { MODEL, groq, transform } from "./transform.mts";
import { printReport, validate } from "./validate.mts";

const args = process.argv.slice(2);
const command = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--only") ?? "run";
const FORCE = args.includes("--force");
const DRY_RUN = args.includes("--dry-run");
const UPGRADE = args.includes("--upgrade");
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;

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
      .map((e) => ({ id: e.id, category: e.category, term: e.en.term.replace(/\s*\(.*?\)/g, "") }));
  } else {
    list = (await readTopics()).filter((t) => FORCE || !byId.has(t.id));
  }
  return ONLY ? list.filter((j) => j.id === ONLY) : list;
}

async function checkGroq() {
  if (!process.env.GROQ_API_KEY) {
    console.error("Missing GROQ_API_KEY. Add it to .env.local (see console.groq.com > API Keys).");
    process.exit(1);
  }
  const ids: string[] = (await groq("/models")).data.map((m: { id: string }) => m.id);
  if (!ids.includes(MODEL)) {
    console.error(`Model "${MODEL}" isn't available on Groq. Set GROQ_MODEL in .env.local to one of:\n  ${ids.join("\n  ")}`);
    process.exit(1);
  }
}

async function main() {
  if (command === "validate") {
    const report = await validate();
    printReport(report, true);
    process.exit(report.errors.length ? 1 : 0);
  }
  if (command === "sync-books") {
    console.log("Downloading OpenStax nursing books...");
    await syncOpenStax(FORCE);
    return;
  }
  if (!["run", "extract", "transform"].includes(command)) {
    console.error(`Unknown command "${command}". Use: sync-books, run, extract, transform, validate.`);
    process.exit(1);
  }

  if (command !== "transform" && !(await hasOpenStax())) {
    console.warn("⚠ OpenStax books not downloaded, so they won't be used. Run: npm run etl -- sync-books\n");
  }
  if (command !== "extract") await checkGroq();

  const work = await jobs();
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
        const entry = await transform(raw);
        if (DRY_RUN) console.log(JSON.stringify(entry, null, 2));
        else await writeJson(entryUrl(entry.category, entry.id), entry);
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
