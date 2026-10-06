// Placeholder shapes shown while a page or (later) AI answers and meaning search load.

export function Bone({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={style}
      className={`rounded-md bg-line motion-safe:animate-pulse ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded border-2 border-line bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <Bone className="h-3 w-10" />
        <Bone className="h-4 w-16 rounded-full" />
      </div>
      <Bone className="h-5 w-2/3" />
      <Bone className="mt-2 h-3.5 w-full" />
      <Bone className="mt-1.5 h-3.5 w-4/5" />
    </div>
  );
}

export function SectionSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="rounded border-2 border-line bg-card p-4">
      <Bone className="mb-3 h-4 w-28" />
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <Bone key={i} className={`h-3.5 ${i % 2 ? "w-4/5" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}
