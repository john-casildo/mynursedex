/* eslint-disable @typescript-eslint/no-explicit-any -- responses from external APIs are untyped JSON */
// EXTRACT: fetch everything we know about a topic from official / open sources and save it,
// unchanged, to data/raw/<category>/<id>.json. No AI here.

import { clip, getJson, htmlToText, rawUrl, today, writeJson, type Job, type RawRecord, type Source } from "./lib.mts";
import { openstaxSources } from "./openstax.mts";

type Fetched = { sources: (Source & { text: string })[]; aliases: string[]; drug_class?: string };

async function fda(name: string): Promise<Fetched> {
  const out: Fetched = { sources: [], aliases: [] };
  const q = encodeURIComponent(`"${name}"`);
  const data = await getJson(
    `https://api.fda.gov/drug/label.json?search=openfda.generic_name:${q}+openfda.brand_name:${q}&limit=10`,
  );
  // Skip combination products (e.g. albuterol + budesonide) so the label is about this drug alone.
  const lower = name.toLowerCase();
  const label = (data?.results ?? []).find((r: any) => {
    const generic = (r.openfda?.generic_name?.[0] ?? "").toLowerCase();
    const brand = (r.openfda?.brand_name?.[0] ?? "").toLowerCase();
    return generic && !generic.includes(" and ") && !generic.includes(",") && (generic.includes(lower) || brand.includes(lower));
  });
  if (!label) return out;

  const o = label.openfda ?? {};
  out.aliases.push(...(o.brand_name ?? []), ...(o.generic_name ?? []));
  const parts = [
    "boxed_warning",
    "indications_and_usage",
    "contraindications",
    "warnings_and_cautions",
    "warnings",
    "adverse_reactions",
    "drug_interactions",
    "overdosage",
  ]
    .filter((s) => label[s])
    .map((s) => `[${s}] ${clip(label[s][0], 500)}`);
  out.sources.push({
    name: `DailyMed: ${o.generic_name?.[0] ?? name} label`,
    publisher: "U.S. FDA / National Library of Medicine",
    url: `https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${label.set_id}`,
    lang: "en",
    text: parts.join("\n"),
  });
  return out;
}

async function rxnorm(name: string): Promise<Fetched> {
  const out: Fetched = { sources: [], aliases: [] };
  const cls = await getJson(
    `https://rxnav.nlm.nih.gov/REST/rxclass/class/byDrugName.json?drugName=${encodeURIComponent(name)}&relaSource=FDASPL&relas=has_EPC`,
  );
  const classes = new Set<string>(
    (cls?.rxclassDrugInfoList?.rxclassDrugInfo ?? []).map((i: any) => i.rxclassMinConceptItem.className),
  );
  if (classes.size) out.drug_class = [...classes].join(", ");

  const rx = await getJson(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=2`);
  const rxcui = rx?.idGroup?.rxnormId?.[0];
  if (rxcui) {
    const rel = await getJson(`https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=BN`);
    for (const g of rel?.relatedGroup?.conceptGroup ?? []) {
      for (const c of g.conceptProperties ?? []) if (!c.name.includes(" - ")) out.aliases.push(c.name);
    }
    out.sources.push({
      name: `RxNorm: ${name}`,
      publisher: "National Library of Medicine",
      url: `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${rxcui}`,
      lang: "en",
      text: out.drug_class ? `Drug class: ${out.drug_class}. Brands: ${out.aliases.join(", ")}` : "",
    });
  }
  return out;
}

async function medline(term: string, spanish: boolean): Promise<Fetched> {
  const out: Fetched = { sources: [], aliases: [] };
  const db = spanish ? "healthTopicsSpanish" : "healthTopics";
  try {
    const res = await fetch(`https://wsearch.nlm.nih.gov/ws/query?db=${db}&term=${encodeURIComponent(term)}&retmax=1`);
    if (!res.ok) return out;
    const xml = await res.text();
    const url = xml.match(/<document rank="0" url="([^"]+)"/)?.[1];
    const summary = xml.match(/<content name="FullSummary">([\s\S]*?)<\/content>/)?.[1];
    const title = xml.match(/<content name="title">([\s\S]*?)<\/content>/)?.[1];
    if (url && summary) {
      out.sources.push({
        name: `MedlinePlus${spanish ? " en español" : ""}: ${htmlToText(htmlToText(title ?? term))}`,
        publisher: "National Library of Medicine",
        url,
        lang: spanish ? "es" : "en",
        // The summary is HTML escaped inside XML, so it's decoded twice.
        text: clip(htmlToText(htmlToText(summary)), 1200),
      });
    }
  } catch {
    // MedlinePlus unreachable: continue without it
  }
  return out;
}

export async function extract(job: Job): Promise<RawRecord> {
  const parts: Fetched[] = [];
  if (job.category === "pharmacology") {
    parts.push(await fda(job.term), await rxnorm(job.term));
  } else if (job.category !== "abbreviations") {
    parts.push(await medline(job.term, false), await medline(job.term, true));
  }
  if (job.category !== "abbreviations") {
    const terms = [job.term, ...parts.flatMap((p) => p.aliases).slice(0, 3)];
    parts.push({ sources: await openstaxSources(terms), aliases: [] });
  }

  const raw: RawRecord = {
    id: job.id,
    category: job.category,
    term: job.term,
    fetched_at: today(),
    drug_class: parts.find((p) => p.drug_class)?.drug_class,
    aliases: [...new Set(parts.flatMap((p) => p.aliases))],
    sources: parts.flatMap((p) => p.sources).filter((s) => s.text),
  };
  await writeJson(rawUrl(job.category, job.id), raw);
  return raw;
}
