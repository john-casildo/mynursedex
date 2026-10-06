"use client";

import { useLang } from "@/lib/lang";

// Page numbers to show: first, last, and the current page with its neighbours, with "…" in the
// gaps, so it fits on a phone however many pages there are. e.g. 1 … 4 5 6 … 12
function pageList(page: number, count: number): (number | "…")[] {
  const keep = new Set([1, count, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => keep.add(p));
  if (page >= count - 2) [count - 1, count - 2, count - 3].forEach((p) => keep.add(p));
  const pages = [...keep].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export default function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  const lang = useLang();
  if (pageCount <= 1) return null;
  const es = lang === "es";
  const arrow =
    "filter-item font-pixel flex h-10 items-center gap-1.5 rounded border-2 border-line bg-card px-3 text-ink hover:border-scrubs disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav aria-label={es ? "Páginas" : "Pages"} className="mt-6">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className={arrow} aria-label={es ? "Página anterior" : "Previous page"}>
          ‹<span className="hidden sm:inline">{es ? "Anterior" : "Previous"}</span>
        </button>

        {pageList(page, pageCount).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} aria-hidden className="px-1 text-muted">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`${es ? "Página" : "Page"} ${p}`}
              className={`filter-item grid h-10 min-w-10 place-items-center rounded border-2 px-2 font-bold tabular-nums ${
                p === page
                  ? "filter-on border-scrubs bg-scrubs text-white shadow-[2px_2px_0_var(--color-navy)]"
                  : "border-line bg-card text-ink hover:border-scrubs"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button onClick={() => onPage(page + 1)} disabled={page === pageCount} className={arrow} aria-label={es ? "Página siguiente" : "Next page"}>
          <span className="hidden sm:inline">{es ? "Siguiente" : "Next"}</span>›
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        {es ? `Página ${page} de ${pageCount}` : `Page ${page} of ${pageCount}`}
      </p>
    </nav>
  );
}
