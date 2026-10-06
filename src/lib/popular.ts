"use client";

// Views per entry: sent to the shared counter (/api/popular) and also kept on this device,
// which is the fallback when the shared counter isn't set up.

const LOCAL_KEY = "nursedex:views";

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
