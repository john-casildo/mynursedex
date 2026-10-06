import areasJson from "./areas.json";
import sectionsJson from "./sections.json";
import type { Area, Category, Lang } from "./types";

// Colors are vivid "type" colors chosen to sit on the navy/blue palette: blues, violet and teal,
// with amber and rose as the warm accents.
type Style = {
  label: Record<Lang, string>;
  short: Record<Lang, string>;
  // Singular name on the Pokémon-style type badge.
  type: Record<Lang, string>;
  color: string;
};

export const AREA_LABELS = areasJson as Record<
  Area,
  { es: string; en: string; short_es: string; short_en: string; type_es: string; type_en: string; color: string }
>;

type SectionDef = { id: string; es: string; en: string; hint?: string };

// Which sections each category has, in display order. Shared with scripts/etl/.
export const SECTIONS = sectionsJson as Record<Category, { care_plans: number; sections: SectionDef[] }>;

export function formatNumber(n: number): string {
  return `#${String(n).padStart(3, "0")}`;
}

export const CATEGORY_STYLES: Record<Category, Style> = {
  pharmacology: {
    label: { en: "Pharmacology", es: "Farmacología" },
    short: { en: "Pharm", es: "Fármacos" },
    type: { en: "Drug", es: "Fármaco" },
    color: "#2F80ED",
  },
  conditions: {
    label: { en: "Conditions", es: "Patologías" },
    short: { en: "Conditions", es: "Patologías" },
    type: { en: "Condition", es: "Patología" },
    color: "#7B5CF0",
  },
  labs: {
    label: { en: "Labs", es: "Laboratorios" },
    short: { en: "Labs", es: "Labs" },
    type: { en: "Lab", es: "Lab" },
    color: "#10B3A3",
  },
  fundamentals: {
    label: { en: "Fundamentals", es: "Fundamentos" },
    short: { en: "Fundamentals", es: "Fundamentos" },
    type: { en: "Basics", es: "Fundamento" },
    color: "#F0A23B",
  },
  abbreviations: {
    label: { en: "Abbreviations", es: "Abreviaturas" },
    short: { en: "Abbrev", es: "Abrev" },
    type: { en: "Abbrev.", es: "Abrev." },
    color: "#6E85B7",
  },
};
