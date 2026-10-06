"use client";

import { useSyncExternalStore } from "react";
import type { Lang } from "./types";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });
  return () => observer.disconnect();
}

// Current language, read from <html lang> (set before paint by the script in layout.tsx).
export function useLang(): Lang {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.lang === "en" ? "en" : "es"),
    () => "es",
  );
}

export function setLang(lang: Lang) {
  document.documentElement.lang = lang;
  try {
    localStorage.setItem("lang", lang);
  } catch {}
}
