import { Bone, KeyPointsSkeleton, PixelLoading, SectionSkeleton } from "@/components/Skeleton";

// Entry page while it loads: same layout as the real page (header, key-points screen,
// sections, and the "on this page" index on wide screens).
export default function Loading() {
  return (
    <div aria-busy="true">
      <Bone className="mb-6 h-4 w-32" />
      <div className="xl:grid xl:grid-cols-[minmax(0,44rem)_14rem] xl:gap-16">
        <div className="min-w-0">
          <PixelLoading className="mb-4" />
          <div className="flex items-center gap-3">
            <Bone className="h-4 w-10" />
            <Bone className="h-4 w-4" />
            <Bone className="h-4 w-24" />
          </div>
          <Bone className="mt-3 h-10 w-3/4 sm:h-12" />
          <Bone className="mt-3 h-4 w-1/3" />
          <div className="mt-5 space-y-2.5">
            <Bone className="h-5 w-full" />
            <Bone className="h-5 w-11/12" />
            <Bone className="h-5 w-2/3" />
          </div>
          <div className="mb-2 mt-6">
            <KeyPointsSkeleton />
          </div>
          <SectionSkeleton lines={4} />
          <SectionSkeleton lines={5} />
          <SectionSkeleton lines={3} />
        </div>

        <div className="hidden xl:block">
          <Bone className="mb-4 h-5 w-32" />
          <div className="space-y-3 border-l-2 border-line pl-3">
            {[24, 32, 28, 20, 30, 26, 22].map((w, i) => (
              <Bone key={i} className="h-3.5" style={{ width: `${w * 4}px` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
