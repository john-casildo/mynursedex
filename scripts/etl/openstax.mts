// OpenStax nursing textbooks (CC BY-NC-SA 4.0): downloaded once into data/raw/openstax/
// (git-ignored, ~20 MB) and searched locally, since OpenStax has no public search API.

import { readdir } from "node:fs/promises";
import { OPENSTAX_DIR, clip, getJson, htmlToText, readJson, writeJson, type Source } from "./lib.mts";

const BOOKS = [
  { uuid: "2f805b43-bce4-4379-add2-4fbf46700e4c", slug: "pharmacology", title: "Pharmacology for Nurses" },
  { uuid: "cede1974-4a2e-47e9-bf60-8ab91962bb1f", slug: "medical-surgical-nursing", title: "Medical-Surgical Nursing" },
  { uuid: "4738cffb-5d2b-49c0-8368-47cb6dafdaa6", slug: "fundamentals-nursing", title: "Fundamentals of Nursing" },
  { uuid: "75dc0490-e1d0-4c96-b05a-d59274e287cc", slug: "clinical-nursing-skills", title: "Clinical Nursing Skills" },
  { uuid: "63229ab9-f9ed-4be4-9d2b-ad5035a02f72", slug: "maternal-newborn-nursing", title: "Maternal-Newborn Nursing" },
];

const LICENSE = {
  name: "CC BY-NC-SA 4.0",
  url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

// Pages with no useful content for entries.
const SKIP = /^(key terms|review questions|chapter summary|summary|check your understanding|references|answer key|index|preface|introduction)$/i;

type Page = { book: string; bookSlug: string; title: string; slug: string; text: string };

const stripNumber = (title: string) => htmlToText(title).replace(/^\d+(\.\d+)*\s*/, "");

// Download every content page of the 4 books. Skips books already downloaded.
export async function syncOpenStax(force = false) {
  const release = await getJson("https://openstax.org/rex/release.json");
  if (!release) throw new Error("Couldn't reach openstax.org");
  const archive = `https://openstax.org${release.archiveUrl}`;

  for (const book of BOOKS) {
    const file = new URL(`${book.slug}.json`, OPENSTAX_DIR);
    if (!force && (await readJson(file))) {
      console.log(`  ${book.title}: already downloaded`);
      continue;
    }
    const version = release.books[book.uuid]?.defaultVersion;
    const tree = await getJson(`${archive}/contents/${book.uuid}@${version}.json`);
    if (!tree) throw new Error(`Couldn't load ${book.title}`);

    const refs: { id: string; title: string; slug: string }[] = [];
    const walk = (n: { contents?: unknown[]; id: string; title: string; slug: string }) => {
      if (n.contents) n.contents.forEach((c) => walk(c as typeof n));
      else if (!SKIP.test(stripNumber(n.title))) refs.push(n);
    };
    walk(tree.tree);

    const pages: Page[] = [];
    // A few requests at a time to stay polite.
    for (let i = 0; i < refs.length; i += 6) {
      const batch = await Promise.all(
        refs.slice(i, i + 6).map(async (r) => {
          const page = await getJson(`${archive}/contents/${book.uuid}@${version}:${r.id.split("@")[0]}.json`);
          return page
            ? { book: book.title, bookSlug: book.slug, title: stripNumber(r.title), slug: r.slug, text: htmlToText(page.content) }
            : null;
        }),
      );
      pages.push(...batch.filter((p): p is Page => p !== null));
      process.stdout.write(`\r  ${book.title}: ${pages.length}/${refs.length} pages`);
    }
    await writeJson(file, pages);
    console.log("");
  }
}

let cache: Page[] | null = null;
async function allPages(): Promise<Page[]> {
  if (cache) return cache;
  cache = [];
  try {
    for (const f of await readdir(OPENSTAX_DIR)) {
      cache.push(...((await readJson<Page[]>(new URL(f, OPENSTAX_DIR))) ?? []));
    }
  } catch {
    // not downloaded yet
  }
  return cache;
}

export async function hasOpenStax(): Promise<boolean> {
  return (await allPages()).length > 0;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The 2 most relevant pages for a topic, with only the passages that mention it.
export async function openstaxSources(terms: string[], maxChars = 900): Promise<(Source & { text: string })[]> {
  const phrases = [...new Set(terms.map((t) => t.toLowerCase().replace(/['’]s\b/g, "").trim()).filter((t) => t.length > 2))];
  if (!phrases.length) return [];
  // Whole phrases first; distinctive single words (e.g. "leopold", "naegele") as a fallback,
  // since books write "Leopold's maneuvers" where the topic says "Leopold maneuvers".
  const common = new Set(["score", "rule", "test", "testing", "screening", "assessment", "monitoring", "syndrome", "disease", "factor", "type", "rate", "blood", "heart", "fetal", "human"]);
  const singles = phrases
    .flatMap((p) => (p.includes(" ") ? p.split(/\s+/) : []))
    .filter((w) => w.length >= 5 && !common.has(w));
  const words = [...phrases, ...new Set(singles)];
  const patterns = words.map((w) => new RegExp(`\\b${escape(w)}(?:['’]s)?\\b`, "gi"));

  const scored = (await allPages())
    .map((page) => {
      const title = page.title.toLowerCase();
      let score = 0;
      for (const [i, re] of patterns.entries()) {
        score += (page.text.match(re)?.length ?? 0) + (title.includes(words[i]) ? 25 : 0);
      }
      return { page, score };
    })
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  return scored.map(({ page }) => {
    // Keep sentences that mention the topic, plus the one after each for context.
    const sentences = page.text.split(/(?<=[.!?])\s+/);
    const keep = new Set<number>();
    sentences.forEach((s, i) => {
      if (patterns.some((re) => (re.lastIndex = 0, re.test(s)))) {
        keep.add(i);
        keep.add(i + 1);
      }
    });
    const text = [...keep]
      .sort((a, b) => a - b)
      .map((i) => sentences[i])
      .filter(Boolean)
      .join(" ");
    return {
      name: `${page.book}: ${page.title}`,
      publisher: "OpenStax",
      url: `https://openstax.org/books/${page.bookSlug}/pages/${page.slug}`,
      lang: "en" as const,
      license: LICENSE,
      text: clip(text, maxChars),
    };
  });
}
