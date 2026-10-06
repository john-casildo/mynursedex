"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import AskPanel from "./AskPanel";
import DexCard from "./DexCard";
import { HOME_EVENT } from "./HomeLink";
import L from "./L";
import MobileFilters from "./MobileFilters";
import Pagination from "./Pagination";
import PixelIcon from "./PixelIcon";
import PixelNurse from "./PixelNurse";
import RequestTopic from "./RequestTopic";
import { DexListSkeleton } from "./Skeleton";
import { AREA_LABELS, CATEGORY_STYLES } from "@/lib/categories";
import { setFilters, syncFilters, useFilters } from "@/lib/category";
import { useLang } from "@/lib/lang";
import { useRecentRaw } from "@/lib/popular";
import type { Lang, SearchItem } from "@/lib/types";

// Cards rendered at once; more load on demand so thousands of entries stay fast.
// Entries per page; the page buttons are under the list.
const PAGE_SIZE = 10;
const SUGGESTIONS = 6;
const POPULAR = 15;

export default function Search({ items }: { items: SearchItem[] }) {
  const lang = useLang();
  const router = useRouter();
  const listboxId = useId();
  // What's typed, and what was submitted (Enter or "Buscar …"). The list follows `query`.
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [showAll, setShowAll] = useState(false);
  // "Recientes": entries opened most recently on this device (null until read in the browser)
  const recentRaw = useRecentRaw();
  const popular = useMemo(() => {
    if (recentRaw === null) return null;
    try {
      const ids = JSON.parse(recentRaw);
      return { ids: Array.isArray(ids) ? (ids as string[]).slice(0, POPULAR) : [] };
    } catch {
      return { ids: [] as string[] };
    }
  }, [recentRaw]);

  // Shared with the desktop sidebar and kept in the URL (?c=labs&a=obstetrics).
  const { category, area } = useFilters();

  // The logo is a full reset: the link drops the filters from the URL, and this clears the search.
  useEffect(() => {
    function reset() {
      setInput("");
      setQuery("");
      setOpen(false);
      setActive(-1);
      setShowAll(false);
    }
    // Arriving here through a Next.js link (e.g. a sidebar category from an entry page) changes
    // the URL silently; re-check it so the sidebar and chips show the right filter.
    syncFilters();
    window.addEventListener(HOME_EVENT, reset);
    return () => window.removeEventListener(HOME_EVENT, reset);
  }, []);



  // Both languages are searched, so "potasio" and "potassium" both work, and diagnoses let
  // "exceso de volumen de líquidos" find heart failure. The current language ranks a bit higher. The other
  // language's summary barely counts: its long prose adds false-friend noise, but it's the only place some
  // English phrases match ("fluid volume excess" → furosemide), so it stays at the bottom instead of out.
  const fuse = useMemo(() => {
    const other = lang === "es" ? "en" : "es";
    return new Fuse(items, {
      keys: [
        { name: `${lang}.term`, weight: 3 },
        { name: `${other}.term`, weight: 2.4 },
        { name: `${lang}.aliases`, weight: 2.5 },
        { name: `${other}.aliases`, weight: 2 },
        { name: `${lang}.diagnoses`, weight: 1.5 },
        { name: `${other}.diagnoses`, weight: 1.2 },
        { name: `${lang}.summary`, weight: 1 },
        { name: `${other}.summary`, weight: 0.4 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      ignoreDiacritics: true,
    });
  }, [items, lang]);

  const suggestions = useMemo(() => {
    const q = input.trim();
    return q && q !== query ? fuse.search(q, { limit: SUGGESTIONS }).map((r) => r.item) : [];
  }, [input, query, fuse]);
  const dropdownOpen = open && suggestions.length > 0;

  function submit(text: string) {
    setQuery(text.trim());
    setOpen(false);
    setActive(-1);
  }

  // Choosing a suggestion opens that concept. "Buscar …" at the bottom of the list still searches.
  function choose(item: SearchItem) {
    setOpen(false);
    setActive(-1);
    router.push(`/concept/${item.id}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (dropdownOpen && active >= 0) choose(suggestions[active]);
      else submit(input);
      // Release focus so the phone keyboard closes and the results are visible.
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const byId = useMemo(() => new Map(items.map((e) => [e.id, e])), [items]);

  // Pages: a new search, filter or view starts again at page 1 (the page is tied to this key).
  const listKey = `${query}|${category}|${area}|${showAll}`;
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  const listTop = useRef<HTMLDivElement>(null);
  function goToPage(next: number) {
    setPageState({ key: listKey, page: next });
    listTop.current?.scrollIntoView({ block: "start" });
  }

  // Searching or filtering: results move up and the assistant moves below them.
  const searching = !!query || category !== "all" || area !== "all";

  // "Todo" without a search shows the most looked-up entries instead of everything.
  const popularView = !query && category === "all" && area === "all" && !showAll;
  const popularItems = popular?.ids.map((id) => byId.get(id)).filter((e): e is SearchItem => Boolean(e)) ?? [];
  const results = useMemo(
    () =>
      (query ? fuse.search(query).map((r) => r.item) : items).filter(
        (e) => (category === "all" || e.category === category) && (area === "all" || e.areas.includes(area)),
      ),
    [query, category, area, fuse, items],
  );
  const shown = popularView ? (popularItems.length ? popularItems : items.slice(0, POPULAR)) : results;
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const page = Math.min(pageState.key === listKey ? pageState.page : 1, pageCount);
  const pageItems = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // For the empty state: a filter can hide entries that exist, e.g. "Abbreviations · OB/GYN" or a search under a filter.
  const filtered = category !== "all" || area !== "all";
  const foundElsewhere = filtered && !!query && results.length === 0 && fuse.search(query, { limit: 1 }).length > 0;
  const filterLabel = (l: Lang) =>
    [category !== "all" && CATEGORY_STYLES[category].label[l], area !== "all" && AREA_LABELS[area][l === "es" ? "short_es" : "short_en"]]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="max-w-5xl">
      <div className="relative max-w-2xl">
        <label className="relative block">
          <span className="sr-only">{lang === "es" ? "Buscar conceptos" : "Search concepts"}</span>
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            enterKeyHint="search"
            autoFocus
            role="combobox"
            aria-expanded={dropdownOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listboxId}-${active}` : undefined}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
              setActive(-1);
              if (!e.target.value.trim()) submit("");
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            placeholder={lang === "es" ? "Busque un fármaco, patología, laboratorio…" : "Look up a drug, condition, lab…"}
            className={`w-full border-2 border-line bg-card py-3.5 pl-12 pr-4 text-lg shadow-[3px_3px_0_var(--line)] placeholder:text-muted focus:border-scrubs focus:shadow-[3px_3px_0_var(--color-scrubs)] focus:outline-none ${
              dropdownOpen ? "rounded-t" : "rounded"
            }`}
          />
        </label>

        {/* Suggestions, Google-style */}
        {dropdownOpen && (
          <ul
            id={listboxId}
            role="listbox"
            className="drop-in absolute inset-x-0 top-full z-30 overflow-hidden rounded-b border-2 border-t-0 border-scrubs bg-card shadow-[3px_3px_0_var(--color-scrubs)]"
          >
            {suggestions.map((item, i) => {
              const cat = CATEGORY_STYLES[item.category];
              const other = lang === "es" ? item.en.term : item.es.term;
              return (
                <li
                  key={item.id}
                  id={`${listboxId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mousedown (not click) so the input doesn't blur and close the list first
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(item);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${i === active ? "bg-screen" : ""}`}
                >
                  <span style={{ color: cat.color }}>
                    <PixelIcon name={item.category} size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold">{item[lang].term}</span>
                    {other !== item[lang].term && <span className="ml-2 text-sm text-muted">{other}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{cat.short[lang]}</span>
                </li>
              );
            })}
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                submit(input);
              }}
              className="cursor-pointer border-t border-line px-4 py-2.5 text-sm text-primary hover:bg-screen"
            >
              <L en={<>Search for &ldquo;{input.trim()}&rdquo;</>} es={<>Buscar &ldquo;{input.trim()}&rdquo;</>} />
            </li>
          </ul>
        )}
      </div>

      {/* Phones: "Filtros" button + active filter pills, with a bottom sheet; desktop uses the sidebar */}
      <MobileFilters resultsCount={results.length} onChange={() => {}} />

      {/* While searching or filtering, the results come first and the assistant moves below them.
          It's reordered with CSS (not re-mounted), so an answer she's reading isn't lost. */}
      <div className="flex flex-col">
      <div className={`max-w-2xl ${searching ? "order-2 mt-12" : "order-1 mt-6"}`}>
        <AskPanel />
      </div>

      <div className={searching ? "order-1" : "order-2"}>
      <div
        ref={listTop}
        className={`mb-2 flex scroll-mt-20 flex-wrap items-baseline justify-between gap-3 ${searching ? "mt-6" : "mt-10"}`}
      >
        <h1 className="font-pixel text-xl text-ink">
          {query ? (
            <L en={<>Results for &ldquo;{query}&rdquo;</>} es={<>Resultados para &ldquo;{query}&rdquo;</>} />
          ) : popularView ? (
            popularItems.length ? (
              <L en="Recently viewed" es="Recientes" />
            ) : (
              <L en="To get started" es="Para empezar" />
            )
          ) : category === "all" ? (
            <L en="All entries" es="Todas las entradas" />
          ) : (
            <L en={CATEGORY_STYLES[category].label.en} es={CATEGORY_STYLES[category].label.es} />
          )}
          {area !== "all" && (
            <>
              {" · "}
              <L en={AREA_LABELS[area].short_en} es={AREA_LABELS[area].short_es} />
            </>
          )}{" "}
          {!popularView && <span className="text-muted">({results.length})</span>}
        </h1>
        {popularView ? (
          <button onClick={() => setShowAll(true)} className="text-sm font-semibold text-primary underline decoration-line underline-offset-4">
            <L en={`See all (${items.length})`} es={`Ver todas (${items.length})`} />
          </button>
        ) : (
          !query &&
          category === "all" &&
          area === "all" && (
            <button onClick={() => setShowAll(false)} className="text-sm font-semibold text-primary underline decoration-line underline-offset-4">
              <L en="Recently viewed" es="Recientes" />
            </button>
          )
        )}
      </div>

      {popularView && popular === null ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">{lang === "es" ? "Cargando…" : "Loading…"}</span>
          <DexListSkeleton count={6} />
        </div>
      ) : shown.length > 0 ? (
        <>
          {/* A new key replays the entrance animation each time the search or filters change */}
          <ul
            key={`${listKey}|${popularView}|${page}`}
            className="grid divide-y divide-line border-y border-line xl:grid-cols-2 xl:gap-x-8 xl:divide-y-0 xl:border-0"
          >
            {pageItems.map((e, i) => (
              <li key={e.id} className="dex-enter xl:border-b xl:border-line" style={{ "--i": i } as React.CSSProperties}>
                <DexCard entry={e} />
              </li>
            ))}
          </ul>
          <Pagination page={page} pageCount={pageCount} onPage={goToPage} />
          {query && results.length === 1 && (
            <button
              onClick={() => router.push(`/concept/${results[0].id}`)}
              className="mt-4 rounded border-2 border-scrubs bg-scrubs px-5 py-2.5 text-sm font-bold text-white"
            >
              <L en={`Open ${results[0].en.term}`} es={`Abrir ${results[0].es.term}`} />
            </button>
          )}
        </>
      ) : (
        <div className="flex max-w-xl items-start gap-4 border-y border-line py-8">
          <PixelNurse size={48} className="shrink-0" />
          {/* Only offer a request when the search finds nothing anywhere; an empty filter isn't a missing topic. */}
          {filtered && (!query || foundElsewhere) ? (
            <div className="space-y-4">
              <p className="leading-relaxed">
                {query ? (
                  <L
                    en={<>&ldquo;{query}&rdquo; isn&rsquo;t in {filterLabel("en")}, but it&rsquo;s in other sections.</>}
                    es={<>&ldquo;{query}&rdquo; no está en {filterLabel("es")}, pero sí en otras secciones.</>}
                  />
                ) : (
                  <L en={<>There&rsquo;s nothing in {filterLabel("en")} yet.</>} es={<>Aún no hay nada en {filterLabel("es")}.</>} />
                )}
              </p>
              <button
                onClick={() => setFilters({ category: "all", area: "all" })}
                className="rounded border-2 border-line bg-card px-5 py-2.5 text-sm font-semibold text-primary hover:border-scrubs"
              >
                {query ? <L en="Search everything" es="Buscar en todo" /> : <L en="Clear filters" es="Quitar filtros" />}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="leading-relaxed">
                <L
                  en={<>&ldquo;{query}&rdquo; isn&rsquo;t in MyNurseDex yet. Check the spelling, or try the English or Spanish name. If it&rsquo;s missing, request it and it will be added overnight.</>}
                  es={<>&ldquo;{query}&rdquo; aún no está en MyNurseDex. Revise la ortografía o pruebe el nombre en inglés o en español. Si falta, solicítelo y se agregará durante la noche.</>}
                />
              </p>
              <RequestTopic topic={query} />
            </div>
          )}
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
