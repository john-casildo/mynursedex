import { Fragment, type ReactNode } from "react";

// Just enough Markdown for the assistant's answers: paragraphs, "-" / "1." lists and **bold**.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export default function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((it, i) => (
      <li key={i} className="flex gap-3">
        {list!.ordered ? (
          <span className="font-bold tabular-nums text-muted">{i + 1}.</span>
        ) : (
          <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 bg-scrubs dark:bg-ceil" />
        )}
        <span>{inline(it)}</span>
      </li>
    ));
    blocks.push(
      <ul key={blocks.length} className="space-y-1.5">
        {items}
      </ul>,
    );
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)/);
    const numbered = line.match(/^\d+[.)]\s+(.*)/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flush();
    if (!line) continue;
    const heading = line.match(/^#{1,4}\s+(.*)/);
    blocks.push(
      heading ? (
        <p key={blocks.length} className="font-bold">
          {inline(heading[1])}
        </p>
      ) : (
        <p key={blocks.length}>{inline(line)}</p>
      ),
    );
  }
  flush();
  return <div className="space-y-3 leading-relaxed">{blocks}</div>;
}
