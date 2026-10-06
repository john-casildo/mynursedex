import areasJson from "./areas.json";
import sectionsJson from "./sections.json";
import type { Area, Category, Lang } from "./types";

export const AREA_LABELS = areasJson as Record<
  Area,
  { es: string; en: string; short_es: string; short_en: string }
>;

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
  { label: Record<Lang, string>; short: Record<Lang, string>; dot: string }
> = {
  pharmacology: {
    label: { en: "Pharmacology", es: "Farmacología" },
    short: { en: "Pharm", es: "Fármacos" },
    dot: "bg-scrubs",
  },
  conditions: {
    label: { en: "Conditions", es: "Patologías" },
    short: { en: "Conditions", es: "Patologías" },
    dot: "bg-ceil",
  },
  labs: {
    label: { en: "Labs", es: "Laboratorios" },
    short: { en: "Labs", es: "Labs" },
    dot: "bg-teal-600",
  },
  fundamentals: {
    label: { en: "Fundamentals", es: "Fundamentos" },
    short: { en: "Fundamentals", es: "Fundamentos" },
    dot: "bg-mask",
  },
  abbreviations: {
    label: { en: "Abbreviations", es: "Abreviaturas" },
    short: { en: "Abbrev", es: "Abrev" },
    dot: "bg-indigo-500",
  },
};
