"use client";

import { useSyncExternalStore } from "react";
import { CATEGORIES, type Category } from "./types";

// The selected category, kept in the URL (?c=labs) and shared by the search page and the
// desktop sidebar. Read from window.location rather than useSearchParams so the home page
// stays fully static: the server renders "all", and the browser picks up ?c= after loading.

const listeners = new Set<() => void>();

function read(): Category | "all" {
  const c = new URLSearchParams(window.location.search).get("c");
  return CATEGORIES.includes(c as Category) ? (c as Category) : "all";
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

export function useCategory(): Category | "all" {
  return useSyncExternalStore(subscribe, read, () => "all");
}

export function setCategory(next: Category | "all") {
  const url = next === "all" ? window.location.pathname : `${window.location.pathname}?c=${next}`;
  window.history.replaceState(window.history.state, "", url);
  listeners.forEach((l) => l());
}
