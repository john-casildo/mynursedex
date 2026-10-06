import Link from "next/link";
import L from "./L";
import TypeBadge from "./TypeBadge";
import { AREA_LABELS, CATEGORY_STYLES, formatNumber } from "@/lib/categories";
import type { SearchItem } from "@/lib/types";

// One dex entry in a list: number, term, category and the first line of the summary.
export default function DexCard({ entry }: { entry: SearchItem }) {
  const cat = CATEGORY_STYLES[entry.category];
  return (
    <Link
      href={`/concept/${entry.id}`}
      className="group grid grid-cols-[3.25rem_1fr] gap-x-3 rounded px-3 py-3.5 transition-colors hover:bg-card focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scrubs"
    >
      <span className="pt-0.5 text-sm font-bold tabular-nums text-muted group-hover:text-primary">
        {formatNumber(entry.number)}
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-lg font-bold leading-snug">
            <L en={entry.en.term} es={entry.es.term} />
          </span>
          {/* Types, like a dex entry: the category, plus any areas as a second type */}
          <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row">
            <TypeBadge color={cat.color} en={cat.type.en} es={cat.type.es} />
            {entry.areas.map((a) => (
              <TypeBadge key={a} color={AREA_LABELS[a].color} en={AREA_LABELS[a].type_en} es={AREA_LABELS[a].type_es} />
            ))}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[15px] leading-relaxed text-muted">
          <L en={entry.en.summary} es={entry.es.summary} />
        </span>
      </span>
    </Link>
  );
}
