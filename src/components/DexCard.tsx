import Link from "next/link";
import L from "./L";
import { CATEGORY_STYLES, formatNumber } from "@/lib/categories";
import type { SearchItem } from "@/lib/types";

export default function DexCard({ entry }: { entry: SearchItem }) {
  const cat = CATEGORY_STYLES[entry.category];
  return (
    <Link
      href={`/concept/${entry.id}`}
      className="block rounded-2xl border-2 border-line bg-card p-4 transition hover:border-ceil hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mask"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-xs text-muted">
          {formatNumber(entry.number)}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cat.badge}`}
        >
          <L en={cat.short.en} es={cat.short.es} />
        </span>
      </div>
      <h2 className="text-lg font-semibold leading-snug">
        <L en={entry.en.term} es={entry.es.term} />
      </h2>
      <p className="mt-1 line-clamp-2 text-sm text-muted">
        <L en={entry.en.summary} es={entry.es.summary} />
      </p>
    </Link>
  );
}
