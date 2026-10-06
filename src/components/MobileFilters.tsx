"use client";

import { useEffect, useRef, useState } from "react";
import L from "./L";
import PixelIcon from "./PixelIcon";
import { AREA_LABELS, CATEGORY_STYLES } from "@/lib/categories";
import { setFilters, useFilters } from "@/lib/category";
import { useLang } from "@/lib/lang";
import { AREAS, CATEGORIES, type Area, type Category } from "@/lib/types";

// Phone filters: a one-line bar ("Filtros" button + the active filters as removable pills) and a
// bottom sheet with every category and area. Tiles wrap and the sheet scrolls, so new areas or
// categories never need a layout change. Desktop uses the sidebar instead.

// Selected tile/pill: its type color as border and a tint of it as background.
const tint = (color: string) => ({
  borderColor: color,
  background: `color-mix(in srgb, ${color} 22%, var(--card))`,
  boxShadow: `2px 2px 0 ${color}`,
});

export default function MobileFilters({ resultsCount, onChange }: { resultsCount: number; onChange: () => void }) {
  const lang = useLang();
  const { category, area } = useFilters();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeCount = (category !== "all" ? 1 : 0) + (area !== "all" ? 1 : 0);

  function update(next: { category?: Category | "all"; area?: Area | "all" }) {
    onChange();
    setFilters(next);
  }

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pills = [
    category !== "all" && {
      key: "c",
      icon: category,
      color: CATEGORY_STYLES[category].color,
      label: CATEGORY_STYLES[category].short[lang],
      remove: () => update({ category: "all" }),
    },
    area !== "all" && {
      key: "a",
      icon: area,
      color: AREA_LABELS[area].color,
      label: lang === "es" ? AREA_LABELS[area].short_es : AREA_LABELS[area].short_en,
      remove: () => update({ area: "all" }),
    },
  ].filter(Boolean) as { key: string; icon: Category | Area; color: string; label: string; remove: () => void }[];

  const tileClass = (active: boolean) =>
    `filter-item flex min-w-0 items-center gap-2 rounded border-2 px-2.5 py-2 text-left text-sm font-semibold text-ink ${
      active ? "filter-on" : "border-line bg-card"
    }`;

  return (
    <div className="lg:hidden">
      {/* The bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="filter-item flex items-center gap-2 rounded border-2 border-line bg-card px-3 py-1.5 text-sm font-bold text-ink shadow-[2px_2px_0_var(--line)]"
        >
          <span className="text-primary">
            <PixelIcon name="filter" size={14} />
          </span>
          <L en="Filters" es="Filtros" />
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-sm bg-scrubs px-1 text-xs text-white">{activeCount}</span>
          )}
        </button>

        {pills.length === 0 ? (
          <span className="text-sm text-muted">
            <L en="Showing everything" es="Mostrando todo" />
          </span>
        ) : (
          pills.map((p) => (
            <button
              key={p.key}
              onClick={p.remove}
              aria-label={lang === "es" ? `Quitar filtro ${p.label}` : `Remove filter ${p.label}`}
              style={tint(p.color)}
              className="filter-item filter-on flex items-center gap-1.5 rounded border-2 px-2.5 py-1 text-sm font-semibold text-ink"
            >
              <span className="filter-icon inline-block" style={{ color: p.color }}>
                <PixelIcon name={p.icon} size={14} />
              </span>
              {p.label}
              <span aria-hidden className="ml-0.5 font-bold text-muted">
                ✕
              </span>
            </button>
          ))
        )}
      </div>

      {/* The bottom sheet */}
      {open && (
        <>
          <div aria-hidden className="sheet-fade fixed inset-0 z-40 bg-navy/50" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={lang === "es" ? "Filtros" : "Filters"}
            className="sheet-up fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-md border-t-2 border-navy bg-card text-ink dark:border-ceil"
          >
            <div className="flex items-center justify-between border-b-2 border-line px-4 py-3">
              <h2 className="font-pixel text-xl">
                <L en="Filters" es="Filtros" />
              </h2>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                aria-label={lang === "es" ? "Cerrar" : "Close"}
                className="grid h-9 w-9 place-items-center rounded border-2 border-line font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-4">
              <h3 className="font-pixel mb-2 text-muted">
                <L en="Type" es="Tipo" />
              </h3>
              <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
                {(["all", ...CATEGORIES] as const).map((id) => {
                  const active = id === category;
                  const color = id === "all" ? "#3D6FA8" : CATEGORY_STYLES[id].color;
                  return (
                    <button
                      key={id}
                      onClick={() => update({ category: id })}
                      aria-pressed={active}
                      style={active ? tint(color) : undefined}
                      className={tileClass(active)}
                    >
                      <span className="filter-icon inline-block shrink-0" style={{ color }}>
                        <PixelIcon name={id} size={18} />
                      </span>
                      <span className="truncate">
                        {id === "all" ? <L en="All" es="Todo" /> : CATEGORY_STYLES[id].label[lang]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <h3 className="font-pixel mb-2 mt-5 text-muted">
                <L en="Area" es="Área" />
              </h3>
              <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
                {AREAS.map((id) => {
                  const active = id === area;
                  return (
                    <button
                      key={id}
                      onClick={() => update({ area: active ? "all" : id })}
                      aria-pressed={active}
                      style={active ? tint(AREA_LABELS[id].color) : undefined}
                      className={tileClass(active)}
                    >
                      <span className="filter-icon inline-block shrink-0" style={{ color: AREA_LABELS[id].color }}>
                        <PixelIcon name={id} size={18} />
                      </span>
                      <span className="truncate">{lang === "es" ? AREA_LABELS[id].short_es : AREA_LABELS[id].short_en}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 border-t-2 border-line px-4 py-3">
              <button
                onClick={() => update({ category: "all", area: "all" })}
                disabled={activeCount === 0}
                className="rounded border-2 border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                <L en="Clear" es="Limpiar" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded border-2 border-scrubs bg-scrubs px-4 py-2.5 text-sm font-bold text-white shadow-[2px_2px_0_var(--color-navy)]"
              >
                <L en={`Show ${resultsCount} results`} es={`Ver ${resultsCount} resultados`} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
