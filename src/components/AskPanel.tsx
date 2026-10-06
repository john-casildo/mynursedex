"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import L from "./L";
import Markdown from "./Markdown";
import PixelNurse from "./PixelNurse";
import RequestTopic from "./RequestTopic";
import { Bone } from "./Skeleton";
import { useLang } from "@/lib/lang";

type Mode = "ask" | "simpler" | "example" | "quiz";
type Source = { id: string; term: string };
type Question = { question: string; options: string[]; answer: number; rationale?: string };

const ERRORS = {
  not_configured: {
    es: "El asistente aún no está configurado (falta la clave de Groq en Vercel).",
    en: "The assistant isn't set up yet (the Groq key is missing on Vercel).",
  },
  rate_limited: {
    es: "Llegó al límite de preguntas por hora. Intente de nuevo más tarde.",
    en: "You've reached the hourly question limit. Try again later.",
  },
  quota: {
    es: "Se agotó la cuota gratuita de IA de hoy. Intente de nuevo mañana.",
    en: "Today's free AI quota is used up. Try again tomorrow.",
  },
  upstream: {
    es: "El asistente no respondió. Intente de nuevo en un momento.",
    en: "The assistant didn't respond. Try again in a moment.",
  },
};

// "Pregúntale a MyNurseDex". With entryId it answers about that entry and offers study shortcuts.
export default function AskPanel({ entryId, entryTerm }: { entryId?: string; entryTerm?: { es: string; en: string } }) {
  const lang = useLang();
  const [input, setInput] = useState("");
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [quiz, setQuiz] = useState<Question[] | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [notCovered, setNotCovered] = useState(false);
  const [error, setError] = useState<keyof typeof ERRORS | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function run(mode: Mode, question = asked) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    setAnswer("");
    setQuiz(null);
    setPicked({});
    setSources([]);
    setNotCovered(false);
    setError(null);
    setAsked(question);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, lang, entryId, mode }),
        signal: controller.signal,
      });
      const type = res.headers.get("Content-Type") ?? "";
      if (type.includes("application/json")) {
        const data = await res.json();
        if (data.covered === false) setNotCovered(true);
        else if (data.error) setError(data.error in ERRORS ? data.error : "upstream");
        else {
          setQuiz(data.questions ?? []);
          setSources(data.sources ?? []);
        }
        return;
      }
      setSources(JSON.parse(decodeURIComponent(res.headers.get("X-Sources") ?? "%5B%5D")));
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((a) => a + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("upstream");
    } finally {
      if (abort.current === controller) setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) run("ask", input.trim());
  }

  const placeholder = entryTerm
    ? lang === "es"
      ? `Pregunte algo sobre ${entryTerm.es}…`
      : `Ask something about ${entryTerm.en}…`
    : lang === "es"
      ? "Ej.: ¿Por qué se vigilan los reflejos con sulfato de magnesio?"
      : "E.g. Why are reflexes checked with magnesium sulfate?";

  const shortcuts: { mode: Mode; en: string; es: string }[] = [
    { mode: "simpler", en: "Explain it more simply", es: "Explícamelo más simple" },
    { mode: "example", en: "Give me a clinical example", es: "Dame un ejemplo clínico" },
    { mode: "quiz", en: "Practice with 3 questions", es: "Practicar con 3 preguntas" },
  ];
  const hasResult = answer || quiz || notCovered || error;

  return (
    <section className="rounded border-2 border-line bg-card p-4 shadow-[4px_4px_0_var(--line)] sm:p-5">
      <div className="flex items-center gap-3">
        <PixelNurse size={36} className={`shrink-0 rounded-sm bg-mist p-0.5 ${loading ? "bob" : ""}`} />
        <div>
          <h2 className="font-pixel text-xl leading-tight">
            {entryId ? <L en="Ask about this topic" es="Pregunte sobre este tema" /> : <L en="Ask MyNurseDex" es="Pregúntale a MyNurseDex" />}
          </h2>
          <p className="text-sm text-muted">
            <L
              en="Answers come only from MyNurseDex entries. Study aid, not clinical advice."
              es="Responde solo con lo que hay en MyNurseDex. Es apoyo de estudio, no indicación clínica."
            />
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor={`ask-${entryId ?? "home"}`}>
          {placeholder}
        </label>
        <input
          id={`ask-${entryId ?? "home"}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          className="min-w-0 flex-1 rounded border-2 border-line bg-bg px-3 py-2.5 placeholder:text-muted focus:border-scrubs focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 rounded border-2 border-scrubs bg-scrubs px-4 font-bold text-white disabled:opacity-50"
        >
          <L en="Ask" es="Preguntar" />
        </button>
      </form>

      {(entryId || answer) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {shortcuts.map((s) => (
            <button
              key={s.mode}
              onClick={() => run(s.mode)}
              disabled={loading}
              className="rounded border-2 border-line px-3 py-1.5 text-sm font-semibold hover:border-scrubs disabled:opacity-50"
            >
              <L en={s.en} es={s.es} />
            </button>
          ))}
        </div>
      )}

      {(loading || hasResult) && (
        <div className="mt-5 border-t-2 border-line pt-4" aria-live="polite">
          {asked && !quiz && <p className="mb-2 text-sm font-semibold text-muted">{asked}</p>}

          {loading && !answer && (
            <div className="space-y-2" role="status">
              <span className="sr-only">{lang === "es" ? "Pensando…" : "Thinking…"}</span>
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-11/12" />
              <Bone className="h-4 w-3/4" />
            </div>
          )}

          {answer && <Markdown text={answer} />}

          {quiz && (
            <>
            <p className="mb-4 text-sm text-muted">
              <L
                en="Practice questions are written by AI from the entry and may contain mistakes. Check the answer against the entry."
                es="Las preguntas de práctica las escribe la IA a partir de la entrada y pueden tener errores. Compare la respuesta con la entrada."
              />
            </p>
            <ol className="space-y-5">
              {quiz.map((q, qi) => (
                <li key={qi}>
                  <p className="font-bold">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="mt-2 grid gap-1.5">
                    {q.options.map((opt, oi) => {
                      const chosen = picked[qi];
                      const revealed = chosen !== undefined;
                      const correct = oi === q.answer;
                      const style = !revealed
                        ? "border-line hover:border-scrubs"
                        : correct
                          ? "border-teal-600 bg-teal-50 dark:bg-teal-900/30"
                          : oi === chosen
                            ? "border-rose-500 bg-rose-50 dark:bg-rose-900/30"
                            : "border-line opacity-60";
                      return (
                        <button
                          key={oi}
                          disabled={revealed}
                          onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                          className={`rounded border-2 px-3 py-2 text-left ${style} ${
                            revealed && oi === chosen ? (correct ? "pop" : "shake") : ""
                          }`}
                        >
                          <span className="mr-2 font-bold">{"ABCD"[oi]}.</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {picked[qi] !== undefined && q.rationale && (
                    <p className="mt-2 text-sm">
                      <strong>
                        {picked[qi] === q.answer ? <L en="Correct. " es="Correcto. " /> : <L en="Not quite. " es="No exactamente. " />}
                      </strong>
                      {q.rationale}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            </>
          )}

          {notCovered && (
            <div className="space-y-3">
              <p>
                <L
                  en={<>&ldquo;{asked}&rdquo; isn&rsquo;t in MyNurseDex yet, so the assistant won&rsquo;t guess.</>}
                  es={<>&ldquo;{asked}&rdquo; aún no está en MyNurseDex, así que el asistente no va a adivinar.</>}
                />
              </p>
              <RequestTopic topic={asked} />
            </div>
          )}

          {error && <p className="text-sm text-muted">{ERRORS[error][lang]}</p>}

          {sources.length > 0 && !loading && (
            <p className="mt-4 text-sm text-muted">
              <L en="Based on: " es="Basado en: " />
              {sources.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && ", "}
                  <Link href={`/concept/${s.id}`} className="font-semibold text-primary underline decoration-line underline-offset-4">
                    {s.term}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
