"use client";

import { useState } from "react";
import L from "./L";
import PixelIcon from "./PixelIcon";
import type { ClaimCheck, Source } from "@/lib/types";

// Marker after a bullet: ✓ confirmed in a source, ⚠ contradicted by a source. Tapping it shows the
// exact quote from the source and a link. Points the check couldn't confirm get no marker.
export default function FactMark({ check, source }: { check?: ClaimCheck; source?: Source }) {
  const [open, setOpen] = useState(false);
  if (!check || check.status === "not_found") return null;
  const ok = check.status === "supported";
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={ok ? "Confirmado en las fuentes: ver cita / Confirmed in the sources: see quote" : "Contradicho por una fuente: ver cita / Contradicted by a source: see quote"}
        title={ok ? "Confirmado en las fuentes" : "Revisar: una fuente dice otra cosa"}
        className={`filter-item ml-1.5 inline-grid h-5 w-5 place-items-center rounded-sm align-[-3px] ${
          ok ? "text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30" : "bg-amber-100 font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
        }`}
      >
        {ok ? <PixelIcon name="check" size={12} /> : <span className="text-xs leading-none">!</span>}
      </button>
      {open && check.quote && (
        <span className={`drop-in mt-2 block rounded border-l-4 px-3 py-2 text-sm ${ok ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" : "border-amber-400 bg-amber-50 dark:bg-amber-900/20"}`}>
          <span className="block text-xs font-semibold text-muted">
            {ok ? <L en="Source says" es="La fuente dice" /> : <L en="A source says something different" es="Una fuente dice otra cosa" />}
            {source && (
              <>
                {" · "}
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {source.name}
                </a>
              </>
            )}
          </span>
          <span className="mt-1 block italic" lang="en">&ldquo;{check.quote}&rdquo;</span>
        </span>
      )}
    </>
  );
}
