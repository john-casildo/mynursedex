import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { NURSE_SIZE, nurseRects } from "@/lib/nurse";

// The card shown when the link is shared (WhatsApp, iMessage, social media).
export const alt = "MyNurseDex: consulta rápida de enfermería, con la enfermera pixelada";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#1E3A5F";
const MIST = "#EEF5FA";
const MASK = "#A8D8EA";
const CEIL = "#8FA9D6";

export default async function Image() {
  const fonts = join(process.cwd(), "src/assets/fonts");
  const [pixel, body] = await Promise.all([
    readFile(join(fonts, "PixelifySans.ttf")),
    readFile(join(fonts, "AtkinsonHyperlegible-Bold.ttf")),
  ]);
  const scale = 15;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: NAVY, padding: "0 80px", gap: 60 }}>
        <div style={{ display: "flex", padding: 20, background: MIST, borderRadius: 12, border: "8px solid white" }}>
          <svg width={NURSE_SIZE * scale} height={NURSE_SIZE * scale} viewBox={`0 0 ${NURSE_SIZE} ${NURSE_SIZE}`} shapeRendering="crispEdges">
            {nurseRects().map((r) => (
              <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
            ))}
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 28 }}>
            <div style={{ width: 22, height: 22, background: MASK }} />
            <div style={{ width: 22, height: 22, background: CEIL }} />
            <div style={{ width: 22, height: 22, background: "white" }} />
          </div>
          <div style={{ fontFamily: "Pixelify", fontSize: 88, color: "white", lineHeight: 1 }}>MyNurseDex</div>
          <div style={{ fontFamily: "Atkinson", fontSize: 38, color: MASK, marginTop: 30, maxWidth: 560, lineHeight: 1.3 }}>
            Fármacos, patologías, laboratorios y planes de cuidado NANDA, en español.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pixelify", data: pixel, style: "normal", weight: 400 },
        { name: "Atkinson", data: body, style: "normal", weight: 700 },
      ],
    },
  );
}
