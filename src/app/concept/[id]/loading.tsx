import { Bone, SectionSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">Cargando… / Loading…</span>
      <Bone className="h-4 w-28" />
      <div className="rounded-3xl border-2 border-line bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <Bone className="h-4 w-12" />
          <Bone className="h-6 w-24 rounded-full" />
        </div>
        <Bone className="h-8 w-3/4" />
        <div className="mt-3 flex gap-1.5">
          <Bone className="h-5 w-16 rounded-full" />
          <Bone className="h-5 w-20 rounded-full" />
          <Bone className="h-5 w-14 rounded-full" />
        </div>
        <Bone className="mt-4 h-4 w-full" />
        <Bone className="mt-2 h-4 w-5/6" />
      </div>
      <SectionSkeleton lines={5} />
      <SectionSkeleton />
      <SectionSkeleton lines={3} />
    </div>
  );
}
