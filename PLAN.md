# MyNurseDex — Plan

A free, fast lookup tool for nursing concepts, built for a 2nd-year nursing student in **Costa Rica** (classes and exams in Spanish).

## Goals
- Find any concept in under a second, even with typos or vague wording ("water pill" → furosemide).
- Clear, exam-focused entries: summary, key points, nursing considerations.
- "Ask AI" button that explains a concept using our own entries (not made-up info).
- $0 cost. Works on phone (she'll use it in clinicals/class).

## Language
- Spanish is the main language; English is available with the EN | ES switch in the header.
- Opens in the phone's language; the choice is remembered (localStorage).
- Every entry stores `es` and `en` text. Search always covers both languages and ignores accents.
- Spanish content targets Costa Rican nursing education: generic drug names (DCI), metric units, mg/dL for glucose. No NCLEX framing.

## Stack (all free)
| Piece | Tool |
|---|---|
| Framework + hosting | Next.js on Vercel (Hobby plan) |
| Styling | Tailwind CSS |
| Fuzzy search (typos) | Fuse.js — in browser |
| Meaning search | Transformers.js + all-MiniLM-L6-v2 — in browser |
| AI explanations + import | Groq API (`openai/gpt-oss-120b`) |
| Data | JSON files in `data/` |

## Design
**Style:** Pokédex-inspired layout in hospital colors: scrubs blue, surgical-mask blue and white.

- Header bar in deep scrubs blue with three "dex lights" (mask blue, white, light blue), the MyNurseDex wordmark and a dark-mode toggle.
- Search bar at the top, then category filter chips (All / Pharm / Conditions / Labs / Fundamentals / Abbrev).
- Results are "dex entry" cards: entry number (#042), category badge, term, one-line summary.
- Concept page = full dex entry: large title, aliases as tags, then labeled sections (Summary, Key Points, Nursing Considerations, Related).
- Phone first, large touch targets, rounded "device" corners.

**Palette**
| Token | Light | Use |
|---|---|---|
| `navy` | `#1E3A5F` | Header, headings (navy scrubs) |
| `scrubs` | `#3D6FA8` | Primary buttons, links, active chip |
| `ceil` | `#8FA9D6` | Borders, secondary accents (ceil-blue scrubs) |
| `mask` | `#A8D8EA` | Highlights, dex lights, focus rings (surgical mask) |
| `mist` | `#EEF5FA` | Page background |
| `white` | `#FFFFFF` | Cards |

Category badges use different shades of blue plus teal so the categories stay easy to tell apart.
Dark mode: navy-black background (`#0F1B2D`), cards `#16263D`, with the same blues as accents.

## Data schema
One file per entry: `data/<category>/<id>.json`
```json
{
  "id": "heart-failure",
  "category": "conditions",
  "es": {
    "term": "Insuficiencia cardíaca (IC)",
    "aliases": ["ic", "falla cardíaca"],
    "summary": "...",
    "key_points": ["..."],
    "sections": { "pathophysiology": ["..."], "signs_symptoms": ["..."], "nursing_care": ["..."] },
    "care_plans": [{
      "diagnosis": "Exceso de volumen de líquidos",
      "type": "actual",
      "related_to": ["..."], "evidenced_by": ["..."],
      "outcomes": ["Equilibrio hídrico: ..."],
      "interventions": [{ "action": "...", "rationale": "..." }]
    }]
  },
  "en": { "...same shape in English..." },
  "related": ["hypertension", "furosemide"],
  "source": "Draft (AI-generated from <urls>), needs review",
  "verified": false
}
```
- **Sections per category** are defined in `src/lib/sections.json`, which both the site and the import script read. Add or rename sections there.
  - Drugs: mechanism, indications, contraindications, adverse effects, interactions, nursing care, patient teaching, antidote/overdose (1 care plan)
  - Conditions: pathophysiology, risk factors, signs & symptoms, diagnostics, treatment, complications, nursing care, patient teaching (2 care plans)
  - Labs: normal values, high, low, specimen collection, nursing care (1 care plan)
  - Fundamentals: purpose, procedure, safety, documentation (1 care plan)
  - Abbreviations: usage, nursing care
- **NANDA-I guardrail**: care plan diagnoses must come from `data/nanda.json`. Plans with anything else are dropped, because models invent plausible-sounding diagnoses. Labels only, no codes. She should align the list with her NANDA edition.
- Search also indexes care plan diagnoses, so searching "exceso de volumen de líquidos" finds heart failure.

Categories: `pharmacology`, `conditions`, `labs`, `fundamentals`, `abbreviations`.

## Scalability
Target: stay fast up to ~5,000+ entries on a cheap phone, at $0.
- **One file per entry**: `data/<category>/<id>.json`. Small diffs, no giant files, easy to move into a database later.
- **Slim search index**: the home page only gets id, category, term, aliases and summary. Full entries are separate static pages (`/concept/[id]`).
- **Paged results**: 50 cards at a time with "Show more".
- **Static build**: every page is prebuilt, so Vercel serves files and there's no server cost per visit.

When to change things:
| Signal | Next step |
|---|---|
| ~5,000+ entries or search feels laggy | Switch Fuse.js → MiniSearch (indexed, much faster), or run search in a Web Worker |
| Search index > ~1 MB compressed | Load the index as a separate cached JSON file instead of inline in the page |
| She (or others) need to edit from a phone | Move entries to Supabase (free plan) and add an edit/verify page |
| Embeddings (Phase 2) | Store as a separate binary file, loaded only when meaning search is used |

## Data pipeline (ETL) — `scripts/etl/`
```
EXTRACT   extract.mts   official/open sources → data/raw/<category>/<id>.json (unchanged, no AI)
            drugs: openFDA/DailyMed label, RxNorm/RxClass (class + brands)
            conditions/labs/fundamentals: MedlinePlus (EN + ES)
            all except abbreviations: OpenStax books (searched locally, 2 best pages)
TRANSFORM transform.mts raw → Spanish draft (Groq) → English translation → cleanup → NANDA check
VALIDATE  validate.mts  every entry checked; errors stop `npm run build` (prebuild), so bad data never deploys
LOAD                    data/<category>/<id>.json
```
Free-plan budget: Groq allows ~200,000 tokens/day **per model**. Drafts use `gpt-oss-120b` (~7k tokens/entry), translations use `gpt-oss-20b` (~6k), so about 25 entries/day. Faster option: Cerebras free plan (same model, ~1M tokens/day) via the same OpenAI-compatible API.

Commands:
- `npm run etl -- sync-books` one-time download of OpenStax books into `data/raw/openstax/` (git-ignored, ~15 MB)
- `npm run etl -- run` new topics from `data/topics.txt` (`--upgrade`, `--force`, `--only <id>`, `--dry-run`)
- `npm run etl -- extract` / `transform` run one stage (transform reuses saved raw data, no re-fetching)
- `npm run validate` (`--verbose` shows warnings)

Each entry lists its `sources` (name, publisher, link, language, license), shown as "Fuentes" at the bottom of the page, with a note that the text is AI-written from them.

## Content rules
- Sources: openFDA/DailyMed, RxNorm/RxClass, MedlinePlus (English + Spanish), OpenStax nursing books.
- OpenStax nursing books are **CC BY-NC-SA 4.0** (not CC BY): fine for a free site, but entries built from them must credit OpenStax and stay under the same license. The license is shown next to each OpenStax source. No copying from her paid textbooks.
- AI may draft entries, but every entry gets reviewed for accuracy before it counts as "verified".
- Prioritize topics from her current semester syllabus.

## Phases

### Phase 1 — Foundation
- [x] Scaffold Next.js + Tailwind + TypeScript
- [x] Define schema type + ~20 starter entries
- [x] Search page with Fuse.js (instant results as you type)
- [x] Concept detail page (`/concept/[id]`) with related links
- [ ] Push to GitHub, deploy to Vercel

### Phase 2 — Smart search
- [ ] `scripts/build-embeddings.js` generates `data/embeddings.json`
- [ ] Load MiniLM in browser, combine fuzzy + meaning results
- [x] Category filters (Pharm / Conditions / Labs / ...)

### Phase 3 — Ask AI
- [x] `/api/ask`: finds matching entries (keywords + Fuse) and streams a Groq answer grounded only in them; nothing matched → no AI call, offers "Solicitar este tema"
- [x] Question box on home + "Pregunte sobre este tema" on every entry, with "Explícamelo más simple", "Dame un ejemplo clínico" and practice mode (3 interactive questions)
- [x] Disclaimer, no doses for real patients, per-IP hourly limit, fallback to `gpt-oss-20b` when the main model's daily quota is used up
- Vercel env: `GROQ_API_KEY` (assistant), `GITHUB_TOKEN` (fine-grained, Issues read/write on this repo, for requests)

### Search & popular
- Google-style suggestions while typing (↑↓ + Enter, or click); Enter or a suggestion runs the search
- "Todo" with an empty search shows the 15 most viewed entries ("Más buscados") + "Ver todas"
- Views counted by `/api/popular` in Upstash Redis (free, via Vercel → Storage); without it, per-device counts

### Notifications
- `.github/workflows/request-received.yml`: the bot comments on each new request → GitHub emails the owner
- The nightly job comments when it adds the entry → another email with the link

### Nightly job — `.github/workflows/nightly.yml`
- 02:00 Costa Rica: `npm run etl -- queue --limit 10` → topic requests (issues labeled `solicitud`) first, then the most-linked missing related topics
- A small model filters each request (nursing topic? category? English name?) and skips duplicates and anything listed in `topics.txt` (planned/hand-written)
- Validates, commits to main (Vercel redeploys) and closes each request with a link
- Repo secret `GROQ_API_KEY`; 10 entries/night leaves Groq quota for the assistant

### Phase 4 — Content
- [ ] Get her syllabus; build a topic list
- [x] Import script (`scripts/import.mts`): topic list → pull facts from RxNorm / openFDA / MedlinePlus → Groq drafts Spanish + English entries → saved as `verified: false` (`--translate` adds Spanish to existing entries)
- [x] Full entries: sections per category + NANDA/NOC/NIC care plans (`--upgrade` re-drafts existing entries)
- [ ] She reviews `data/nanda.json` against her NANDA edition
- [x] ETL pipeline with raw cache, validation gate and structured sources
- [ ] Costa Rica sources: CCSS Lista Oficial de Medicamentos, Ministerio de Salud guidelines, OPS/PAHO
- [ ] Simple review flow so she can mark entries verified
- [ ] Grow to ~300 entries, then ~800–1000
- [ ] Have her review/flag entries

### Phase 5 — Nice-to-haves
- [x] Loading skeletons (search + entry pages)
- [ ] Favorites / recently viewed (localStorage)
- [ ] Flashcard mode from entries
- [ ] Installable on phone (PWA) + offline support
- [x] Dark mode

## Needed accounts (free)
- GitHub
- Vercel (sign in with GitHub)
- Groq API key — console.groq.com (Phase 3)
