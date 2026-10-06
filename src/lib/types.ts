export const CATEGORIES = [
  "pharmacology",
  "conditions",
  "labs",
  "fundamentals",
  "abbreviations",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Lang = "en" | "es";

// A nursing care plan built on a NANDA-I diagnosis, with NOC outcomes and NIC interventions.
// Labels only, no codes.
export type CarePlan = {
  diagnosis: string;
  type: "actual" | "risk";
  // "Related to" for actual diagnoses, risk factors for risk diagnoses.
  related_to: string[];
  // Defining characteristics ("as evidenced by"); empty for risk diagnoses.
  evidenced_by: string[];
  outcomes: string[];
  interventions: { action: string; rationale: string }[];
};

// The text of an entry in one language.
export type Localized = {
  term: string;
  aliases: string[];
  summary: string;
  key_points: string[];
  // Keyed by section id from sections.json; which sections exist depends on the category.
  sections: Record<string, string[]>;
  care_plans: CarePlan[];
};

// Where an entry's facts came from (filled in by the ETL's extract step).
export type Source = {
  name: string;
  publisher: string;
  url: string;
  lang: Lang;
  license?: { name: string; url: string };
};

export type Concept = {
  id: string;
  category: Category;
  es: Localized;
  en: Localized;
  related: string[];
  sources: Source[];
  // True when the text was written by AI from the sources (not copied from them).
  ai_drafted: boolean;
  // Stays false until someone has checked the entry against a trusted source.
  verified: boolean;
  // YYYY-MM-DD of the last time the entry was generated or edited.
  updated: string;
};

export type DexEntry = Concept & { number: number };

type SearchText = Pick<Localized, "term" | "aliases" | "summary"> & {
  diagnoses: string[];
};

// The slim version of an entry sent to the browser for search and cards.
export type SearchItem = Pick<DexEntry, "id" | "number" | "category"> & {
  es: SearchText;
  en: SearchText;
};
