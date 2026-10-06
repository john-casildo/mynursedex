import sectionsJson from "./sections.json";
import type { Category, Lang } from "./types";

type SectionDef = { id: string; es: string; en: string; hint?: string };

// Which sections each category has, in display order. Shared with scripts/import.mts.
export const SECTIONS = sectionsJson as Record<
  Category,
  { care_plans: number; sections: SectionDef[] }
>;

export function formatNumber(n: number): string {
  return `#${String(n).padStart(3, "0")}`;
}

export const CATEGORY_STYLES: Record<
  Category,
  { label: Record<Lang, string>; short: Record<Lang, string>; badge: string }
> = {
  pharmacology: {
    label: { en: "Pharmacology", es: "Farmacología" },
    short: { en: "Pharm", es: "Fármacos" },
    badge: "bg-scrubs text-white",
  },
  conditions: {
    label: { en: "Conditions", es: "Patologías" },
    short: { en: "Conditions", es: "Patologías" },
    badge: "bg-navy text-white dark:bg-ceil dark:text-navy",
  },
  labs: {
    label: { en: "Labs", es: "Laboratorios" },
    short: { en: "Labs", es: "Labs" },
    badge: "bg-teal-600 text-white",
  },
  fundamentals: {
    label: { en: "Fundamentals", es: "Fundamentos" },
    short: { en: "Fundamentals", es: "Fundamentos" },
    badge: "bg-mask text-navy",
  },
  abbreviations: {
    label: { en: "Abbreviations", es: "Abreviaturas" },
    short: { en: "Abbrev", es: "Abrev" },
    badge: "bg-indigo-500 text-white",
  },
};
