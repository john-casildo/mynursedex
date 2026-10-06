import L from "./L";
import PixelNurse from "./PixelNurse";

// Placeholders shown while pages, the "Más buscados" list and AI answers load. They copy the
// real layouts (dex rows, type badges, the key-points screen) and use the site's pixel style:
// square corners and a stepped LCD-like light band instead of a smooth pulse (see .skel in
// globals.css; it stands still with reduced motion).

export function Bone({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden style={style} className={`skel rounded-[2px] ${className}`} />;
}

// "Cargando…" with the pixel nurse bobbing and the dots appearing one at a time.
export function PixelLoading({ className = "" }: { className?: string }) {
  return (
    <p role="status" className={`flex items-center gap-3 text-muted ${className}`}>
      <PixelNurse size={28} className="bob shrink-0 rounded-sm bg-mist p-0.5" />
      <span className="font-pixel text-lg">
        <L en="Loading" es="Cargando" />
        <span aria-hidden className="loading-dots" />
      </span>
    </p>
  );
}

// One dex row: number, term, two type badges and two summary lines (same grid as DexCard).
export function DexRowSkeleton({ i = 0 }: { i?: number }) {
  return (
    <div className="grid grid-cols-[3.25rem_1fr] gap-x-3 px-3 py-3.5">
      <Bone className="mt-1 h-4 w-9" />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <Bone className="h-5" style={{ width: `${[55, 40, 62, 48, 35, 58][i % 6]}%` }} />
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row">
            <Bone className="h-[22px] w-[7rem] rounded-[5px]" />
            {i % 3 === 0 && <Bone className="h-[22px] w-[7rem] rounded-[5px]" />}
          </div>
        </div>
        <Bone className="mt-2.5 h-3.5 w-full" />
        <Bone className="mt-2 h-3.5 w-4/5" />
      </div>
    </div>
  );
}

// A list of rows laid out like the real results list (two columns on wide screens).
export function DexListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul aria-hidden className="grid divide-y divide-line border-y border-line xl:grid-cols-2 xl:gap-x-8 xl:divide-y-0 xl:border-0">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="xl:border-b xl:border-line">
          <DexRowSkeleton i={i} />
        </li>
      ))}
    </ul>
  );
}

// Bullet rows with the square pixel bullets used on entry pages.
function BulletBones({ lines }: { lines: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 bg-line" />
          <Bone className="h-3.5" style={{ width: `${[92, 78, 86, 64, 74][i % 5]}%` }} />
        </div>
      ))}
    </div>
  );
}

// The "Puntos clave" dex screen.
export function KeyPointsSkeleton() {
  return (
    <div className="rounded border-2 border-navy/15 bg-screen px-5 py-4 dark:border-white/10">
      <Bone className="mb-4 h-5 w-32" />
      <BulletBones lines={4} />
    </div>
  );
}

// A collapsible section on an entry page: pixel heading + bullets, separated by a rule.
export function SectionSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="border-t border-line py-5">
      <Bone className="mb-4 h-5 w-40" />
      <BulletBones lines={lines} />
    </div>
  );
}
