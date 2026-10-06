"use client";

import { useSyncExternalStore } from "react";
import PixelIcon from "./PixelIcon";

// Dark mode on/off. The button looks "selected" while dark mode is on; that highlight comes from
// CSS on the html "dark" class (globals.css), so it's right even before React loads.

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      data-theme-btn
      aria-pressed={dark}
      aria-label={dark ? "Modo oscuro activado / Dark mode on" : "Modo oscuro desactivado / Dark mode off"}
      title={dark ? "Modo oscuro: sí" : "Modo oscuro: no"}
      className="filter-item grid h-9 w-9 place-items-center rounded text-mask hover:bg-white/10"
    >
      <PixelIcon name="moon" size={18} />
    </button>
  );
}
