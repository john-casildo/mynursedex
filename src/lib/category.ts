"use client";

import { useSyncExternalStore } from "react";
import { AREAS, CATEGORIES, type Area, type Category } from "./types";

// The selected category (?c=labs) and area (?a=obstetrics), kept in the URL and shared by the
// search page and the desktop sidebar. Read from window.location rather than useSearchParams so
// the home page stays fully static: the server renders "all", and the browser picks up the URL
// after loading.

export type Filters = { category: Category | "all"; area: Area | "all" };

const listeners = new Set<() => void>();
let cachedSearch = "";
let cached: Filters = { category: "all", area: "all" };
const SERVER: Filters = { category: "all", area: "all" };

function read(): Filters {
  // useSyncExternalStore needs the same object back while nothing changed.
  if (window.location.search === cachedSearch) return cached;
  const params = new URLSearchParams(window.location.search);
  const c = params.get("c");
  const a = params.get("a");
  cachedSearch = window.location.search;
  cached = {
    category: CATEGORIES.includes(c as Category) ? (c as Category) : "all",
    area: AREAS.includes(a as Area) ? (a as Area) : "all",
  };
  return cached;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

export function useFilters(): Filters {
  return useSyncExternalStore(subscribe, read, () => SERVER);
}

export function filtersToQuery({ category, area }: Partial<Filters>): string {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("c", category);
  if (area && area !== "all") params.set("a", area);
  const q = params.toString();
  return q ? `?${q}` : "";
}

// Next.js navigations (Link, router) change the URL without a popstate event, so anything that
// navigates to the search page calls this to make every filter reader re-check the URL.
export function syncFilters() {
  listeners.forEach((l) => l());
}

export function setFilters(next: Partial<Filters>) {
  const merged = { ...read(), ...next };
  window.history.replaceState(window.history.state, "", window.location.pathname + filtersToQuery(merged));
  listeners.forEach((l) => l());
}
