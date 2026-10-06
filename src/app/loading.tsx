import { Bone, DexListSkeleton, PixelLoading } from "@/components/Skeleton";

// Home page while it loads: search bar, filter chips (phones), the assistant box and the list.
export default function Loading() {
  return (
    <div aria-busy="true" className="max-w-5xl">
      <div className="flex h-[58px] max-w-2xl items-center gap-4 rounded border-2 border-line bg-card px-4 shadow-[3px_3px_0_var(--line)]">
        <Bone className="h-5 w-5" />
        <Bone className="h-4 w-1/2" />
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-hidden px-4 pb-1 lg:hidden">
        {[14, 20, 26, 16, 26].map((w, i) => (
          <Bone key={i} className="h-9 shrink-0 rounded-[3px]" style={{ width: `${w * 4}px` }} />
        ))}
      </div>

      <div className="mt-6 max-w-2xl rounded border-2 border-line bg-card p-4 shadow-[4px_4px_0_var(--line)] sm:p-5">
        <div className="flex items-center gap-3">
          <Bone className="h-9 w-9" />
          <div className="flex-1 space-y-2">
            <Bone className="h-5 w-44" />
            <Bone className="h-3.5 w-3/4" />
          </div>
        </div>
        <Bone className="mt-4 h-11 w-full" />
      </div>

      <PixelLoading className="mb-2 mt-10" />
      <DexListSkeleton count={6} />
    </div>
  );
}
