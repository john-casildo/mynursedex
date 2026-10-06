"use client";

import { setLang, useLang } from "@/lib/lang";
import type { Lang } from "@/lib/types";

export default function LangToggle() {
  const lang = useLang();
  return (
    <div className="flex rounded bg-white/10 p-0.5 text-xs font-bold">
      {(["es", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          data-lang-btn={l}
          className="rounded-sm px-2.5 py-1.5 uppercase text-mask transition hover:bg-white/10"
        >
          {l}
        </button>
      ))}
    </div>
  );
}
