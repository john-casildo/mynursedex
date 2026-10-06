import L from "./L";

// A type label in the style of the GBA-era Pokémon games: fixed width, two-tone fill
// (lighter top half), darker border and a hard text shadow. Used only on dex cards.
export default function TypeBadge({ color, en, es }: { color: string; en: string; es: string }) {
  return (
    <span
      className="font-type inline-flex h-[22px] w-[7rem] shrink-0 items-center justify-center rounded-[5px] border-2 text-[12px] tracking-wide uppercase leading-none text-white"
      style={{
        background: `linear-gradient(to bottom, color-mix(in srgb, ${color} 70%, white) 0 50%, ${color} 50% 100%)`,
        borderColor: `color-mix(in srgb, ${color} 60%, black)`,
        textShadow: `1px 1px 0 color-mix(in srgb, ${color} 45%, black)`,
      }}
    >
      <L en={en} es={es} />
    </span>
  );
}
