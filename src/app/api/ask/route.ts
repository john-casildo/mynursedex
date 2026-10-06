import { entryContext, findEntries, modeTask, quizPrompt, systemPrompt, type AskMode } from "@/lib/assistant";
import { rateLimited } from "@/lib/rate-limit";
import type { Lang } from "@/lib/types";

// "Pregúntale a MyNurseDex": answers only from matching MyNurseDex entries, via Groq's free API.
//
// POST { question, lang, entryId?, mode? }  →
//   covered = false:      { covered: false }                 (nothing in MyNurseDex matches)
//   mode "quiz":          { questions: [...] , sources }      (JSON)
//   otherwise:            streamed plain text; sources in the X-Sources header

export const maxDuration = 30;

const GROQ = "https://api.groq.com/openai/v1/chat/completions";
// Groq's free plan has a daily token budget per model; fall back to the smaller model when the
// main one is used up.
const MODELS = [process.env.GROQ_MODEL ?? "openai/gpt-oss-120b", process.env.GROQ_FALLBACK_MODEL ?? "openai/gpt-oss-20b"];

const MODES: AskMode[] = ["ask", "simpler", "example", "quiz"];

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

async function callGroq(body: Record<string, unknown>): Promise<Response> {
  let last: Response | null = null;
  for (const model of MODELS) {
    const res = await fetch(GROQ, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, model }),
    });
    if (res.status !== 429) return res;
    last = res;
  }
  return last!;
}

// Turns Groq's server-sent events into a plain text stream of the answer.
function textStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  return upstream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.startsWith("data: ") ? line.slice(6).trim() : "";
          if (!data || data === "[DONE]") continue;
          try {
            const text = JSON.parse(data).choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            // ignore keep-alive or partial lines
          }
        }
      },
    }),
  );
}

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return json({ error: "not_configured" }, 503);
  }
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 500) : "";
  const lang: Lang = body?.lang === "en" ? "en" : "es";
  const mode: AskMode = MODES.includes(body?.mode) ? body.mode : "ask";
  const entryId = typeof body?.entryId === "string" ? body.entryId : undefined;
  if (!question && !entryId) return json({ error: "empty" }, 400);

  if (rateLimited(req, "ask", 30)) return json({ error: "rate_limited" }, 429);

  const found = findEntries(question, entryId);
  if (found.length === 0) return json({ covered: false });

  const context = "ENTRADAS / ENTRIES:\n\n" + found.map((e) => entryContext(e, lang)).join("\n\n");
  const sources = found.map((e) => ({ id: e.id, term: e[lang].term }));
  const topic = question || found[0][lang].term;
  const task = mode === "ask" || mode === "quiz" ? "" : `\n${lang === "es" ? "TAREA" : "TASK"}: ${modeTask(mode, lang)}`;
  const userText = `${context}\n\n${lang === "es" ? "PREGUNTA" : "QUESTION"}: ${topic}${task}`;

  if (mode === "quiz") {
    const res = await callGroq({
      temperature: 0.4,
      max_completion_tokens: 2500,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: quizPrompt(lang) },
        { role: "user", content: userText },
      ],
    });
    if (!res.ok) return json({ error: res.status === 429 ? "quota" : "upstream" }, 502);
    try {
      const data = await res.json();
      const questions = (JSON.parse(data.choices[0].message.content).questions ?? [])
        .filter(
          (q: { question?: unknown; options?: unknown; answer?: unknown }) =>
            typeof q.question === "string" &&
            Array.isArray(q.options) &&
            q.options.length >= 2 &&
            Number.isInteger(q.answer) &&
            (q.answer as number) < q.options.length,
        )
        .slice(0, 3);
      return json({ questions, sources });
    } catch {
      return json({ error: "upstream" }, 502);
    }
  }

  const res = await callGroq({
    temperature: 0.3,
    max_completion_tokens: 1500,
    reasoning_effort: "low",
    stream: true,
    messages: [
      { role: "system", content: systemPrompt(lang) },
      { role: "user", content: userText },
    ],
  });
  if (!res.ok || !res.body) return json({ error: res.status === 429 ? "quota" : "upstream" }, 502);

  return new Response(textStream(res.body), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Sources": encodeURIComponent(JSON.stringify(sources)),
    },
  });
}
