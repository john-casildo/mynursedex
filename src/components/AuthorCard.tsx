"use client";

import { useEffect, useId, useRef, useState } from "react";
import L from "./L";
import PixelIcon from "./PixelIcon";
import JCLogo from "./JCLogo";

const LINKS = [
  { label: "LinkedIn", url: "https://www.linkedin.com/in/john-casildo", icon: "linkedin" as const, bg: "#0A66C2" },
  { label: "GitHub", url: "https://github.com/john-casildo", icon: "github" as const, bg: "#24292F" },
];

// The creator's name in the credit line. Tapping it opens a small card above it with links.
export default function AuthorCard({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);
  const cardId = useId();

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapper} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={cardId}
        className="font-semibold underline underline-offset-4"
      >
        {name}
      </button>

      {open && (
        <span
          id={cardId}
          role="dialog"
          aria-label={name}
          style={{ transformOrigin: "bottom left" }}
          className="drop-in absolute bottom-full left-0 z-40 mb-2 block w-60 rounded border-2 border-navy bg-card p-3 text-left text-ink shadow-[4px_4px_0_var(--color-navy)] dark:border-ceil dark:shadow-[4px_4px_0_var(--color-ceil)]"
        >
          <span className="flex items-center gap-3">
            {/* John's own "JC" logo from his portfolio */}
            <JCLogo title="JC" rough={false} className="h-11 w-11 shrink-0" />
            <span className="block">
              <span className="font-pixel block text-lg leading-tight">{name}</span>
              <span className="block text-xs text-muted">
                <L en="Creator of MyNurseDex" es="Creador de MyNurseDex" />
              </span>
            </span>
          </span>
          <span className="mt-3 grid gap-2">
            {LINKS.map((link, i) => (
              <a
                key={link.label}
                ref={i === 0 ? firstLink : undefined}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: link.bg }}
                className="flex items-center gap-2.5 rounded px-3 py-2 text-sm font-bold text-white no-underline hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mask"
              >
                <PixelIcon name={link.icon} size={16} />
                {link.label}
              </a>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}
