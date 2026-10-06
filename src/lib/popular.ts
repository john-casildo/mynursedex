"use client";

import { useSyncExternalStore } from "react";

// Views per entry: sent to the shared counter (/api/popular) and also kept on this device,
// which is the fallback when the shared counter isn't set up.

const LOCAL_KEY = "nursedex:views";
// Recently opened entries on this device, newest first (shown as "Recientes" on the home page).
const RECENT_KEY = "nursedex:recent";
const RECENT_MAX = 30;

// The raw stored list as a string (a stable value for useSyncExternalStore); null on the server,
// so the server render shows the skeleton and the browser fills in this device's list.
export function useRecentRaw(): string | null {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => {
      try {
        return localStorage.getItem(RECENT_KEY) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => null,
  );
}

export function getRecent(limit = 15): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((x) => typeof x === "string").slice(0, limit) : [];
  } catch {
    return [];
  }
}

function readLocal(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function recordView(id: string) {
  try {
    const counts = readLocal();
    counts[id] = (counts[id] ?? 0) + 1;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(counts));
    const recent = [id, ...getRecent(RECENT_MAX).filter((x) => x !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    // storage unavailable (private mode): the shared counter still works
  }
  fetch("/api/popular", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
    keepalive: true,
  }).catch(() => {});
}

// Top ids: shared ranking when available, otherwise this device's most-viewed.
export async function fetchPopular(limit = 15): Promise<{ ids: string[]; shared: boolean }> {
  try {
    const res = await fetch("/api/popular");
    const data = await res.json();
    if (data.configured && data.ids.length) return { ids: data.ids.slice(0, limit), shared: true };
  } catch {
    // fall through to local counts
  }
  const local = Object.entries(readLocal())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, limit);
  return { ids: local, shared: false };
}
