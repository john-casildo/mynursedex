"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/popular";

// Counts a view of an entry page, for the "Más buscados" list.
export default function ViewTracker({ id }: { id: string }) {
  useEffect(() => {
    recordView(id);
  }, [id]);
  return null;
}
