"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import L from "./L";
import { filtersToQuery, setFilters, useFilters } from "@/lib/category";
import { AREA_LABELS, CATEGORY_STYLES } from "@/lib/categories";
import { AREAS, CATEGORIES, type Area, type Category } from "@/lib/types";

// Category list in the desktop sidebar. On the search page it filters in place;
// from other pages it links back to the search page with ?c= set.
const itemClass = (active: boolean) =>
  `flex items-center gap-3 rounded px-3 py-2 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mask ${
    active ? "bg-white/15 text-white" : "text-ceil hover:bg-white/5 hover:text-white"
  }`;

export default function CategoryNav({
  counts,
  areaCounts,
}: {
  counts: Record<Category | "all", number>;
  areaCounts: Record<Area, number>;
}) {
  const pathname = usePathname();
  const filters = useFilters();
  const onSearch = pathname === "/";
  const current = onSearch ? filters.category : null;
  const currentArea = onSearch ? filters.area : null;

  const items = [
    { id: "all" as const, en: "Everything", es: "Todo", dot: "bg-white" },
    ...CATEGORIES.map((c) => ({
      id: c,
      en: CATEGORY_STYLES[c].label.en,
      es: CATEGORY_STYLES[c].label.es,
      dot: CATEGORY_STYLES[c].dot,
    })),
  ];

  return (
    <>
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = current === item.id;
        return (
          <li key={item.id}>
            <Link
              href={"/" + filtersToQuery({ category: item.id })}
              onClick={(e) => {
                if (!onSearch) return;
                e.preventDefault();
                setFilters({ category: item.id });
              }}
              aria-current={active ? "page" : undefined}
              className={itemClass(active)}
            >
              <span className={`h-2.5 w-2.5 shrink-0 ${item.dot}`} />
              <span className="flex-1">
                <L en={item.en} es={item.es} />
              </span>
              <span className="text-sm tabular-nums opacity-70">{counts[item.id]}</span>
            </Link>
          </li>
        );
      })}
    </ul>

    <p className="font-pixel mb-2 mt-8 px-3 text-ceil/70">
      <L en="Areas" es="Áreas" />
    </p>
    <ul className="space-y-0.5">
      {AREAS.map((id) => {
        const active = currentArea === id;
        return (
          <li key={id}>
            <Link
              href={"/" + filtersToQuery({ area: id })}
              onClick={(e) => {
                if (!onSearch) return;
                e.preventDefault();
                setFilters({ area: active ? "all" : id });
              }}
              aria-pressed={active}
              className={itemClass(active)}
            >
              <span className="flex-1">
                <L en={AREA_LABELS[id].en} es={AREA_LABELS[id].es} />
              </span>
              <span className="text-sm tabular-nums opacity-70">{areaCounts[id]}</span>
            </Link>
          </li>
        );
      })}
    </ul>
    </>
  );
}
