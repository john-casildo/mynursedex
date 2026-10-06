import { Bone, CardSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Cargando… / Loading…</span>
      <Bone className="h-[52px] w-full rounded-2xl" />
      <div className="mt-3 flex gap-2">
        {[12, 20, 22, 14, 24].map((w) => (
          <Bone key={w} className="h-8 shrink-0 rounded-full" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      <Bone className="mb-3 mt-4 h-3 w-20" />
      <div className="grid gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
