import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AskPanel from "@/components/AskPanel";
import DexCard from "@/components/DexCard";
import L from "@/components/L";
import PixelIcon from "@/components/PixelIcon";
import ViewTracker from "@/components/ViewTracker";
import { AREA_LABELS, CATEGORY_STYLES, SECTIONS, formatNumber } from "@/lib/categories";
import { entries, getEntry, toSearchItem } from "@/lib/concepts";
import type { CarePlan, DexEntry, Lang, Localized, Source } from "@/lib/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return entries.map((e) => ({ id: e.id }));
}

export async function generateMetadata(props: PageProps<"/concept/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const entry = getEntry(id);
  return entry ? { title: `${entry.es.term} · MyNurseDex`, description: entry.es.summary } : {};
}

const TEXT = {
  en: {
    other: "In Spanish",
    alsoKnown: "Also searched as",
    draft: "Draft: not yet checked against a textbook. Double-check before relying on it.",
    keyPoints: "Key points",
    onThisPage: "On this page",
    carePlans: "Care plans",
    carePlanIntro: "NANDA-I diagnoses with NOC outcomes and NIC interventions.",
    carePlanNote: "Labels without codes. Check the exact wording and codes in your NANDA book.",
    actual: "Actual",
    risk: "Risk",
    relatedTo: "Related to (r/t)",
    riskFactors: "Risk factors",
    evidencedBy: "As evidenced by (AEB)",
    outcomes: "Expected outcomes (NOC)",
    interventions: "Interventions (NIC)",
    rationale: "Why",
  },
  es: {
    other: "En inglés",
    alsoKnown: "También se busca como",
    draft: "Borrador: aún no revisado con un libro de texto. Verifíquelo antes de confiar en él.",
    keyPoints: "Puntos clave",
    onThisPage: "En esta entrada",
    carePlans: "Planes de cuidado",
    carePlanIntro: "Diagnósticos NANDA-I con resultados NOC e intervenciones NIC.",
    carePlanNote: "Etiquetas sin códigos. Verifique la redacción exacta y los códigos en su libro NANDA.",
    actual: "Real",
    risk: "Riesgo",
    relatedTo: "Relacionado con (r/c)",
    riskFactors: "Factores de riesgo",
    evidencedBy: "Manifestado por (m/p)",
    outcomes: "Resultados esperados (NOC)",
    interventions: "Intervenciones (NIC)",
    rationale: "Por qué",
  },
};

type T = (typeof TEXT)[Lang];

// Square "pixel" bullets to match the dex look.
function Bullets({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`space-y-2 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 leading-relaxed">
          <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 bg-scrubs dark:bg-ceil" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <details id={id} open className="group scroll-mt-20 border-t border-line py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scrubs">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <span aria-hidden className="font-pixel text-muted transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <Bullets items={items} className="section-body mt-3" />
    </details>
  );
}

function CarePlanCard({ plan, t }: { plan: CarePlan; t: T }) {
  const risk = plan.type === "risk";
  const rows = [
    { label: risk ? t.riskFactors : t.relatedTo, items: plan.related_to },
    { label: t.evidencedBy, items: risk ? [] : plan.evidenced_by },
    { label: t.outcomes, items: plan.outcomes },
  ].filter((r) => r.items.length > 0);

  return (
    <article className="rounded border-2 border-line bg-card shadow-[4px_4px_0_var(--line)]">
      <header className="flex items-start justify-between gap-3 border-b-2 border-line px-4 py-3">
        <h3 className="text-lg font-bold leading-snug">{plan.diagnosis}</h3>
        <span
          className={`shrink-0 rounded-sm px-2 py-0.5 text-xs font-bold ${
            risk ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" : "bg-mask text-navy"
          }`}
        >
          {risk ? t.risk : t.actual}
        </span>
      </header>
      <dl className="space-y-4 px-4 py-4 text-[15px]">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="mb-1.5 font-bold text-primary">{r.label}</dt>
            <dd>
              <Bullets items={r.items} />
            </dd>
          </div>
        ))}
        {plan.interventions.length > 0 && (
          <div>
            <dt className="mb-1.5 font-bold text-primary">{t.interventions}</dt>
            <dd>
              {/* Ordered: interventions are listed in priority order. */}
              <ol className="space-y-3">
                {plan.interventions.map((iv, i) => (
                  <li key={iv.action} className="grid grid-cols-[1.5rem_1fr] leading-relaxed">
                    <span className="font-bold tabular-nums text-muted">{i + 1}</span>
                    <span>
                      {iv.action}
                      {iv.rationale && (
                        <span className="mt-0.5 block text-sm text-muted">
                          {t.rationale}: {iv.rationale}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

function Sources({ entry }: { entry: DexEntry }) {
  return (
    <section id="sources" className="scroll-mt-20 border-t-2 border-ink/80 pt-5 text-sm">
      <h2 className="font-pixel mb-3 text-lg">
        <L en="Sources" es="Fuentes" />
      </h2>
      {entry.sources.length > 0 ? (
        <ul className="space-y-2.5">
          {entry.sources.map((s: Source) => (
            <li key={s.url} className="leading-snug">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline decoration-line underline-offset-4 hover:decoration-current"
              >
                {s.name}
              </a>
              <span className="block text-muted">
                {s.publisher}
                {s.lang === "es" && <L en=", in Spanish" es=", en español" />}
                {s.license && (
                  <>
                    {", "}
                    <a href={s.license.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {s.license.name}
                    </a>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">
          <L
            en="No external sources yet: written from general nursing knowledge."
            es="Aún sin fuentes externas: redactado con conocimientos generales de enfermería."
          />
        </p>
      )}
      <p className="mt-4 max-w-prose text-muted">
        {entry.ai_drafted && (
          <L
            en="Written with AI based on these sources, not copied from them. "
            es="Redactado con IA a partir de estas fuentes, no copiado de ellas. "
          />
        )}
        {entry.verified ? <L en="Reviewed." es="Revisado." /> : <L en="Pending review." es="Pendiente de revisión." />}{" "}
        <L en="Updated" es="Actualizado" /> {entry.updated}.
      </p>
    </section>
  );
}

// The entry's text in one language. Both are rendered; CSS shows the selected one.
function Body({ lang, text, otherTerm, entry }: { lang: Lang; text: Localized; otherTerm: string; entry: DexEntry }) {
  const t = TEXT[lang];
  const cat = CATEGORY_STYLES[entry.category];
  const sections = SECTIONS[entry.category].sections.filter((s) => (text.sections[s.id] ?? []).length > 0);
  const plans = text.care_plans ?? [];
  const toc = [
    ...sections.map((s) => ({ href: `#${lang}-${s.id}`, label: s[lang] })),
    ...(plans.length ? [{ href: `#${lang}-care-plans`, label: t.carePlans }] : []),
  ];

  return (
    <div className={`lang-${lang}`} lang={lang}>
      <div className="xl:grid xl:grid-cols-[minmax(0,44rem)_14rem] xl:gap-16">
        <div className="min-w-0">
          <header className="pb-6">
            <p className="flex items-center gap-3 text-sm text-muted">
              <span className="font-bold tabular-nums text-primary">{formatNumber(entry.number)}</span>
              <span className="flex items-center gap-1.5">
                <span style={{ color: cat.color }}>
                  <PixelIcon name={entry.category} size={16} />
                </span>
                {cat.label[lang]}
              </span>
              {entry.areas.map((a) => (
                <Link
                  key={a}
                  href={`/?a=${a}`}
                  className="rounded-sm border border-line px-1.5 py-0.5 text-xs hover:border-scrubs hover:text-ink"
                >
                  {lang === "es" ? AREA_LABELS[a].es : AREA_LABELS[a].en}
                </Link>
              ))}
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">{text.term}</h1>
            {otherTerm !== text.term && (
              <p className="mt-2 text-muted">
                {t.other}: <span className="text-ink">{otherTerm}</span>
              </p>
            )}
            <p className="mt-5 max-w-prose text-xl leading-relaxed">{text.summary}</p>
            {text.aliases.length > 0 && (
              <p className="mt-4 max-w-prose text-sm text-muted">
                {t.alsoKnown}: {text.aliases.join(", ")}
              </p>
            )}
            {!entry.verified && (
              <p className="mt-5 max-w-prose border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                {t.draft}
              </p>
            )}
          </header>

          {/* Phone/tablet: section shortcuts */}
          {toc.length > 1 && (
            <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 xl:hidden" aria-label={t.onThisPage}>
              {toc.map((item) => (
                <a key={item.href} href={item.href} className="shrink-0 rounded border-2 border-line bg-card px-3 py-1 text-sm hover:border-scrubs">
                  {item.label}
                </a>
              ))}
            </nav>
          )}

          {/* The dex "screen": the most exam-relevant facts */}
          {text.key_points.length > 0 && (
            <section id={`${lang}-key-points`} className="screen-on mb-2 rounded border-2 border-navy/15 bg-screen px-5 py-4 dark:border-white/10">
              <h2 className="text-lg font-bold">{t.keyPoints}</h2>
              <Bullets items={text.key_points} className="mt-3" />
            </section>
          )}

          {sections.map((s) => (
            <Section key={s.id} id={`${lang}-${s.id}`} title={s[lang]} items={text.sections[s.id]} />
          ))}

          {plans.length > 0 && (
            <section id={`${lang}-care-plans`} className="scroll-mt-20 border-t border-line py-5">
              <h2 className="text-lg font-bold">{t.carePlans}</h2>
              <p className="mt-1 text-muted">{t.carePlanIntro}</p>
              <div className="mt-4 space-y-5">
                {plans.map((p) => (
                  <CarePlanCard key={p.diagnosis} plan={p} t={t} />
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">{t.carePlanNote}</p>
            </section>
          )}
        </div>

        {/* Desktop: sticky index */}
        {toc.length > 1 && (
          <nav className="hidden xl:block" aria-label={t.onThisPage}>
            <div className="sticky top-10">
              <p className="font-pixel mb-3 text-muted">{t.onThisPage}</p>
              <ul className="space-y-1 border-l-2 border-line">
                {toc.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="-ml-0.5 block border-l-2 border-transparent py-1 pl-3 text-sm text-muted hover:border-scrubs hover:text-ink">
                      {item.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#sources" className="-ml-0.5 block border-l-2 border-transparent py-1 pl-3 text-sm text-muted hover:border-scrubs hover:text-ink">
                    {lang === "es" ? "Fuentes" : "Sources"}
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

export default async function ConceptPage(props: PageProps<"/concept/[id]">) {
  const { id } = await props.params;
  const entry = getEntry(id);
  if (!entry) notFound();

  const related = entry.related.map(getEntry).filter((e): e is DexEntry => e !== undefined);

  return (
    <article>
      <ViewTracker id={entry.id} />
      <Link
        href="/"
        className="font-pixel mb-6 inline-flex items-center gap-2 rounded text-base text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scrubs"
      >
        <span aria-hidden>‹</span>
        <L en="Back to search" es="Volver a buscar" />
      </Link>

      <Body lang="es" text={entry.es} otherTerm={entry.en.term} entry={entry} />
      <Body lang="en" text={entry.en} otherTerm={entry.es.term} entry={entry} />

      <div className="max-w-[44rem] space-y-8 pt-4">
        <AskPanel entryId={entry.id} entryTerm={{ es: entry.es.term, en: entry.en.term }} />
        {related.length > 0 && (
          <section className="border-t border-line pt-5">
            <h2 className="font-pixel mb-2 text-xl">
              <L en="Related" es="Relacionados" />
            </h2>
            <ul className="divide-y divide-line">
              {related.map((r) => (
                <li key={r.id}>
                  <DexCard entry={toSearchItem(r)} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <Sources entry={entry} />
      </div>
    </article>
  );
}
