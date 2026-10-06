"use client";

import { useState } from "react";
import L from "./L";

// Files a topic request; the nightly job builds the entry and it appears the next day.
export default function RequestTopic({ topic }: { topic: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function send() {
    setState("sending");
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <p className="font-semibold text-primary">
        <L
          en={<>Requested. &ldquo;{topic}&rdquo; should be in NurseDex by tomorrow.</>}
          es={<>Solicitado. &ldquo;{topic}&rdquo; debería estar en NurseDex mañana.</>}
        />
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={send}
        disabled={state === "sending" || topic.trim().length < 3}
        className="rounded border-2 border-scrubs bg-scrubs px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_var(--color-navy)] disabled:opacity-50"
      >
        {state === "sending" ? <L en="Requesting…" es="Solicitando…" /> : <L en="Request this topic" es="Solicitar este tema" />}
      </button>
      {state === "error" && (
        <span className="text-sm text-muted">
          <L en="The request couldn't be sent. Try again later." es="No se pudo enviar la solicitud. Intente más tarde." />
        </span>
      )}
    </div>
  );
}
