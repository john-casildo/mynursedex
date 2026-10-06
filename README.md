# NurseDex

Quick lookup for nursing concepts (drugs, conditions, labs, procedures and abbreviations) for nursing students in Costa Rica. Spanish first, with English too.

- Fuzzy search in both languages, works with typos and without accents
- Full entries: pathophysiology, nursing care, patient teaching, and NANDA-I / NOC / NIC care plans
- Every entry lists its sources

> **Study aid only.** Entries are drafted with AI from the listed sources and marked as drafts until reviewed. Always follow your instructors, facility policy and current drug references.

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run validate     # check all entries (also runs before every build)
```

## Content pipeline

Entries live in `data/<category>/<id>.json` and are built by the ETL in `scripts/etl/`:

```bash
npm run etl -- sync-books   # one-time: download OpenStax nursing books
npm run etl -- run          # build entries for new topics in data/topics.txt
```

Needs a free [Groq](https://console.groq.com) API key in `.env.local` as `GROQ_API_KEY=...`. See [PLAN.md](PLAN.md) for the full design.

## Sources and license

Facts come from openFDA / DailyMed, RxNorm, MedlinePlus (National Library of Medicine) and the OpenStax nursing textbooks. Entries built from OpenStax content are adapted from works licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) by OpenStax and are shared under the same license.
