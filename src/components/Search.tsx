"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import AskPanel from "./AskPanel";
import DexCard from "./DexCard";
import L from "./L";
import PixelIcon from "./PixelIcon";
import PixelNurse from "./PixelNurse";
import RequestTopic from "./RequestTopic";
import { AREA_LABELS, CATEGORY_STYLES } from "@/lib/categories";
import { setFilters, useFilters } from "@/lib/category";
import { useLang } from "@/lib/lang";
import { AREAS, CATEGORIES, type Area, type Category, type SearchItem } from "@/lib/types";

// Cards rendered at once; more load on demand so thousands of entries stay fast.
const PAGE_SIZE = 50;

export default function Search({ items }: { items: SearchItem[] }) {
  const lang = useLang();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Shared with the desktop sidebar and kept in the URL (?c=labs&a=obstetrics).
  const { category, area } = useFilters();

  function selectCategory(next: Category | "all") {
    setLimit(PAGE_SIZE);
    setFilters({ category: next });
  }

  function toggleArea(next: Area) {
    setLimit(PAGE_SIZE);
    setFilters({ area: area === next ? "all" : next });
  }

  // Both languages are always searched, so "potasio" and "potassium" both work.
  // Diagnoses are included so "exceso de volumen de líquidos" finds heart failure.
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: "es.term", weight: 3 },
          { name: "en.term", weight: 3 },
          { name: "es.aliases", weight: 2.5 },
          { name: "en.aliases", weight: 2.5 },
          { name: "es.summary", weight: 1 },
          { name: "en.summary", weight: 1 },
          { name: "es.diagnoses", weight: 1.5 },
          { name: "en.diagnoses", weight: 1.5 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
        ignoreDiacritics: true,
      }),
    [items],
  );

  const results = useMemo(() => {
    const q = query.trim();
    const matched = q ? fuse.search(q).map((r) => r.item) : items;
    return matched.filter(
      (e) => (category === "all" || e.category === category) && (area === "all" || e.areas.includes(area)),
    );
  }, [query, category, area, fuse, items]);

  return (
    <div className="max-w-5xl">
      <label className="relative block max-w-2xl">
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
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE_SIZE);
          }}
          placeholder={
            lang === "es" ? "Busque un fármaco, patología, laboratorio…" : "Look up a drug, condition, lab…"
          }
          className="w-full rounded border-2 border-line bg-card py-3.5 pl-12 pr-4 text-lg shadow-[3px_3px_0_var(--line)] placeholder:text-muted focus:border-scrubs focus:shadow-[3px_3px_0_var(--color-scrubs)] focus:outline-none"
        />
      </label>

      {/* Category chips on phones; desktop uses the sidebar */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {(["all", ...CATEGORIES] as const).map((id) => {
          const active = id === category;
          return (
            <button
              key={id}
              onClick={() => selectCategory(id)}
              aria-pressed={active}
              className={`flex shrink-0 items-center gap-1.5 rounded border-2 px-3 py-1.5 text-sm font-semibold ${
                active ? "border-scrubs bg-scrubs text-white" : "border-line bg-card text-ink"
              }`}
            >
              {id !== "all" && (
                <span style={{ color: active ? "#FFFFFF" : CATEGORY_STYLES[id].color }}>
                  <PixelIcon name={id} size={14} />
                </span>
              )}
              {id === "all" ? (
                <L en="All" es="Todo" />
              ) : (
                <L en={CATEGORY_STYLES[id].short.en} es={CATEGORY_STYLES[id].short.es} />
              )}
            </button>
          );
        })}
        <span aria-hidden className="mx-1 w-px shrink-0 bg-line" />
        {AREAS.map((id) => (
          <button
            key={id}
            onClick={() => toggleArea(id)}
            aria-pressed={area === id}
            className={`flex shrink-0 items-center gap-1.5 rounded border-2 px-3 py-1.5 text-sm font-semibold ${
              area === id ? "border-navy bg-navy text-white dark:border-ceil dark:bg-ceil dark:text-navy" : "border-line bg-card text-ink"
            }`}
          >
            <span style={{ color: area === id ? "currentColor" : AREA_LABELS[id].color }}>
              <PixelIcon name={id} size={14} />
            </span>
            <L en={AREA_LABELS[id].short_en} es={AREA_LABELS[id].short_es} />
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-2xl">
        <AskPanel />
      </div>

      <h1 className="font-pixel mb-2 mt-10 text-xl text-ink">
        {category === "all" ? (
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
        <span className="text-muted">({results.length})</span>
      </h1>

      {results.length > 0 ? (
        <>
          <ul className="grid divide-y divide-line border-y border-line xl:grid-cols-2 xl:gap-x-8 xl:divide-y-0 xl:border-0">
            {results.slice(0, limit).map((e) => (
              <li key={e.id} className="xl:border-b xl:border-line">
                <DexCard entry={e} />
              </li>
            ))}
          </ul>
          {results.length > limit && (
            <button
              onClick={() => setLimit(limit + PAGE_SIZE)}
              className="mt-4 rounded border-2 border-line bg-card px-5 py-2.5 text-sm font-semibold text-primary hover:border-scrubs"
            >
              <L en="Show more" es="Mostrar más" /> ({results.length - limit})
            </button>
          )}
        </>
      ) : (
        <div className="flex max-w-xl items-start gap-4 border-y border-line py-8">
          <PixelNurse size={48} className="shrink-0" />
          <div className="space-y-4">
            <p className="leading-relaxed">
              <L
                en={<>&ldquo;{query}&rdquo; isn&rsquo;t in NurseDex yet. Check the spelling, or try the English or Spanish name. If it&rsquo;s missing, request it and it will be added overnight.</>}
                es={<>&ldquo;{query}&rdquo; aún no está en NurseDex. Revise la ortografía o pruebe el nombre en inglés o en español. Si falta, solicítelo y se agregará durante la noche.</>}
              />
            </p>
            <RequestTopic topic={query.trim()} />
          </div>
        </div>
      )}
    </div>
  );
}
