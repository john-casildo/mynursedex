"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import DexCard from "./DexCard";
import L from "./L";
import { CATEGORY_STYLES } from "@/lib/categories";
import { useLang } from "@/lib/lang";
import { CATEGORIES, type Category, type SearchItem } from "@/lib/types";

// Cards rendered at once; more load on demand so thousands of entries stay fast.
const PAGE_SIZE = 50;

export default function Search({ items }: { items: SearchItem[] }) {
  const lang = useLang();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

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
    return category === "all"
      ? matched
      : matched.filter((e) => e.category === category);
  }, [query, category, fuse, items]);

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">
          {lang === "es" ? "Buscar conceptos" : "Search concepts"}
        </span>
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
            lang === "es"
              ? "Buscar fármaco, patología, laboratorio..."
              : "Search a drug, condition, lab..."
          }
          className="w-full rounded-2xl border-2 border-line bg-card py-3.5 pl-12 pr-4 text-base shadow-sm placeholder:text-muted focus:border-scrubs focus:outline-none focus:ring-4 focus:ring-mask/50"
        />
      </label>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {(["all", ...CATEGORIES] as const).map((c) => {
          const active = c === category;
          return (
            <button
              key={c}
              onClick={() => {
                setCategory(c);
                setLimit(PAGE_SIZE);
              }}
              className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-scrubs bg-scrubs text-white"
                  : "border-line bg-card text-ink hover:border-ceil"
              }`}
            >
              {c === "all" ? (
                <L en="All" es="Todo" />
              ) : (
                <L en={CATEGORY_STYLES[c].short.en} es={CATEGORY_STYLES[c].short.es} />
              )}
            </button>
          );
        })}
      </div>

      <p className="mb-3 mt-4 text-xs text-muted">
        {results.length}{" "}
        <L
          en={results.length === 1 ? "entry" : "entries"}
          es={results.length === 1 ? "entrada" : "entradas"}
        />
      </p>

      {results.length > 0 ? (
        <>
          <ul className="grid gap-3">
            {results.slice(0, limit).map((e) => (
              <li key={e.id}>
                <DexCard entry={e} />
              </li>
            ))}
          </ul>
          {results.length > limit && (
            <button
              onClick={() => setLimit(limit + PAGE_SIZE)}
              className="mt-4 w-full rounded-2xl border-2 border-line bg-card py-3 text-sm font-semibold text-primary hover:border-ceil"
            >
              <L en="Show more" es="Mostrar más" /> ({results.length - limit})
            </button>
          )}
        </>
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-muted">
          <L
            en={<>No entries match &ldquo;{query}&rdquo; yet.</>}
            es={<>Todavía no hay resultados para &ldquo;{query}&rdquo;.</>}
          />
        </p>
      )}
    </div>
  );
}
