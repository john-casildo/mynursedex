"use client";

import { setLang, useLang } from "@/lib/lang";
import type { Lang } from "@/lib/types";

export default function LangToggle() {
  const lang = useLang();
  return (
    <div className="flex rounded-full bg-white/10 p-0.5 text-xs font-bold">
      {(["es", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1.5 uppercase transition ${
            lang === l ? "bg-mask text-navy" : "text-mask hover:bg-white/10"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
