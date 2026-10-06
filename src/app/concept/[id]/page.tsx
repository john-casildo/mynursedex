import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DexCard from "@/components/DexCard";
import L from "@/components/L";
import { CATEGORY_STYLES, SECTIONS, formatNumber } from "@/lib/categories";
import { entries, getEntry, toSearchItem } from "@/lib/concepts";
import type { CarePlan, DexEntry, Lang, Localized, Source } from "@/lib/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return entries.map((e) => ({ id: e.id }));
}

export async function generateMetadata(
  props: PageProps<"/concept/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const entry = getEntry(id);
  return entry
    ? { title: `${entry.es.term} · NurseDex`, description: entry.es.summary }
    : {};
}

const TEXT = {
  en: {
    other: "Spanish",
    draft:
      "Draft entry, not yet checked against a textbook. Double-check before relying on it.",
    keyPoints: "Key points",
    carePlans: "Care plan (NANDA · NOC · NIC)",
    carePlanNote:
      "NANDA-I, NOC and NIC labels without codes. Check the exact wording and codes in your NANDA book.",
    diagnosis: "Nursing diagnosis",
    actual: "Actual",
    risk: "Risk",
    relatedTo: "Related to (r/t)",
    riskFactors: "Risk factors",
    evidencedBy: "As evidenced by (AEB)",
    outcomes: "Expected outcomes (NOC)",
    interventions: "Interventions (NIC)",
    rationale: "Rationale",
  },
  es: {
    other: "Inglés",
    draft:
      "Entrada en borrador, aún no revisada con un libro de texto. Verifíquela antes de confiar en ella.",
    keyPoints: "Puntos clave",
    carePlans: "Plan de cuidados (NANDA · NOC · NIC)",
    carePlanNote:
      "Etiquetas NANDA-I, NOC y NIC sin códigos. Verifique la redacción exacta y los códigos en su libro NANDA.",
    diagnosis: "Diagnóstico de enfermería",
    actual: "Real",
    risk: "Riesgo",
    relatedTo: "Relacionado con (r/c)",
    riskFactors: "Factores de riesgo",
    evidencedBy: "Manifestado por (m/p)",
    outcomes: "Resultados esperados (NOC)",
    interventions: "Intervenciones (NIC)",
    rationale: "Fundamento",
  },
};

function Sources({ entry }: { entry: DexEntry }) {
  return (
    <section className="rounded-2xl border-2 border-line bg-card p-4 text-sm">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
        <L en="Sources" es="Fuentes" />
      </h2>
      {entry.sources.length > 0 ? (
        <ul className="space-y-2">
          {entry.sources.map((s: Source) => (
            <li key={s.url} className="leading-snug">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {s.name} ↗
              </a>
              <span className="block text-xs text-muted">
                {s.publisher}
                {s.lang === "es" && " · español"}
                {s.license && (
                  <>
                    {" · "}
                    <a
                      href={s.license.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
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
      <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
        {entry.ai_drafted && (
          <L
            en="Written with AI based on these sources, not copied from them. "
            es="Redactado con IA a partir de estas fuentes, no copiado de ellas. "
          />
        )}
        {entry.verified ? (
          <L en="Reviewed." es="Revisado." />
        ) : (
          <L en="Pending review." es="Pendiente de revisión." />
        )}{" "}
        <L en="Updated" es="Actualizado" />: {entry.updated}
      </p>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 leading-relaxed">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-scrubs dark:bg-ceil" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({
  id,
  title,
  items,
  accent = "bg-mist text-navy dark:bg-white/10 dark:text-mask",
}: {
  id: string;
  title: string;
  items: string[];
  accent?: string;
}) {
  if (items.length === 0) return null;
  return (
    <details
      id={id}
      open
      className="group scroll-mt-20 rounded-2xl border-2 border-line bg-card p-4"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <h2
          className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${accent}`}
        >
          {title}
        </h2>
        <span className="text-muted transition group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-3">
        <Bullets items={items} />
      </div>
    </details>
  );
}

function CarePlanCard({ plan, t }: { plan: CarePlan; t: (typeof TEXT)[Lang] }) {
  const risk = plan.type === "risk";
  return (
    <div className="rounded-2xl border-2 border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            {t.diagnosis}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold leading-snug">
            {plan.diagnosis}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
            risk ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200" : "bg-mask text-navy"
          }`}
        >
          {risk ? t.risk : t.actual}
        </span>
      </div>

      <dl className="mt-3 space-y-3 text-sm">
        {plan.related_to.length > 0 && (
          <div>
            <dt className="font-semibold text-primary">
              {risk ? t.riskFactors : t.relatedTo}
            </dt>
            <dd className="mt-1">
              <Bullets items={plan.related_to} />
            </dd>
          </div>
        )}
        {!risk && plan.evidenced_by.length > 0 && (
          <div>
            <dt className="font-semibold text-primary">{t.evidencedBy}</dt>
            <dd className="mt-1">
              <Bullets items={plan.evidenced_by} />
            </dd>
          </div>
        )}
        {plan.outcomes.length > 0 && (
          <div>
            <dt className="font-semibold text-primary">{t.outcomes}</dt>
            <dd className="mt-1">
              <Bullets items={plan.outcomes} />
            </dd>
          </div>
        )}
        {plan.interventions.length > 0 && (
          <div>
            <dt className="font-semibold text-primary">{t.interventions}</dt>
            <dd className="mt-1">
              <ol className="space-y-2">
                {plan.interventions.map((iv, i) => (
                  <li key={iv.action} className="flex gap-2 leading-relaxed">
                    <span className="font-mono text-xs leading-6 text-muted">
                      {i + 1}.
                    </span>
                    <span>
                      {iv.action}
                      {iv.rationale && (
                        <span className="mt-0.5 block text-xs text-muted">
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
    </div>
  );
}

// The entry's text in one language. Both are rendered; CSS shows the selected one.
function Body({
  lang,
  text,
  otherTerm,
  entry,
}: {
  lang: Lang;
  text: Localized;
  otherTerm: string;
  entry: DexEntry;
}) {
  const t = TEXT[lang];
  const cat = CATEGORY_STYLES[entry.category];
  const sections = SECTIONS[entry.category].sections.filter(
    (s) => (text.sections[s.id] ?? []).length > 0,
  );
  const plans = text.care_plans ?? [];

  return (
    <div className={`lang-${lang} space-y-4`} lang={lang}>
      <header className="rounded-3xl border-2 border-line bg-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-sm text-muted">
            {formatNumber(entry.number)}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${cat.badge}`}
          >
            {cat.label[lang]}
          </span>
        </div>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
          {text.term}
        </h1>
        {otherTerm !== text.term && (
          <p className="mt-1 text-sm text-muted">
            {t.other}: {otherTerm}
          </p>
        )}
        {text.aliases.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {text.aliases.map((a) => (
              <span
                key={a}
                className="rounded-full bg-mist px-2.5 py-0.5 text-xs text-navy dark:bg-white/10 dark:text-mask"
              >
                {a}
              </span>
            ))}
          </div>
        )}
        <p className="mt-4 text-base leading-relaxed">{text.summary}</p>
        {!entry.verified && (
          <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            {t.draft}
          </p>
        )}
      </header>

      {(sections.length > 1 || plans.length > 0) && (
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${lang}-${s.id}`}
              className="shrink-0 rounded-full border-2 border-line bg-card px-3 py-1 text-xs font-medium hover:border-ceil"
            >
              {s[lang]}
            </a>
          ))}
          {plans.length > 0 && (
            <a
              href={`#${lang}-care-plans`}
              className="shrink-0 rounded-full border-2 border-scrubs bg-scrubs px-3 py-1 text-xs font-medium text-white"
            >
              NANDA
            </a>
          )}
        </nav>
      )}

      <Section
        id={`${lang}-key-points`}
        title={t.keyPoints}
        items={text.key_points}
        accent="bg-mask text-navy"
      />
      {sections.map((s) => (
        <Section
          key={s.id}
          id={`${lang}-${s.id}`}
          title={s[lang]}
          items={text.sections[s.id]}
          accent={
            s.id === "nursing_care" ? "bg-scrubs text-white" : undefined
          }
        />
      ))}

      {plans.length > 0 && (
        <section id={`${lang}-care-plans`} className="scroll-mt-20 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            {t.carePlans}
          </h2>
          {plans.map((p) => (
            <CarePlanCard key={p.diagnosis} plan={p} t={t} />
          ))}
          <p className="text-xs text-muted">{t.carePlanNote}</p>
        </section>
      )}
    </div>
  );
}

export default async function ConceptPage(props: PageProps<"/concept/[id]">) {
  const { id } = await props.params;
  const entry = getEntry(id);
  if (!entry) notFound();

  const related = entry.related
    .map(getEntry)
    .filter((e): e is DexEntry => e !== undefined);

  return (
    <article className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        ← <L en="Back to search" es="Volver a buscar" />
      </Link>

      <Body lang="es" text={entry.es} otherTerm={entry.en.term} entry={entry} />
      <Body lang="en" text={entry.en} otherTerm={entry.es.term} entry={entry} />

      {related.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            <L en="Related" es="Relacionados" />
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.id}>
                <DexCard entry={toSearchItem(r)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Sources entry={entry} />
    </article>
  );
}
