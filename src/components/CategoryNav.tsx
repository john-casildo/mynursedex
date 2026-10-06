"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import L from "./L";
import { setCategory, useCategory } from "@/lib/category";
import { CATEGORY_STYLES } from "@/lib/categories";
import { CATEGORIES, type Category } from "@/lib/types";

// Category list in the desktop sidebar. On the search page it filters in place;
// from other pages it links back to the search page with ?c= set.
export default function CategoryNav({ counts }: { counts: Record<Category | "all", number> }) {
  const pathname = usePathname();
  const selected = useCategory();
  const onSearch = pathname === "/";
  const current = onSearch ? selected : null;

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
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = current === item.id;
        return (
          <li key={item.id}>
            <Link
              href={item.id === "all" ? "/" : `/?c=${item.id}`}
              onClick={(e) => {
                if (!onSearch) return;
                e.preventDefault();
                setCategory(item.id);
              }}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded px-3 py-2 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mask ${
                active ? "bg-white/15 text-white" : "text-ceil hover:bg-white/5 hover:text-white"
              }`}
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
  );
}
