import { ICONS, type IconName } from "@/lib/icons";

export default function PixelIcon({
  name,
  size = 18,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const grid = ICONS[name];
  return (
    <svg
      viewBox="0 0 9 9"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      {grid.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill="currentColor"
              opacity={c === "o" ? 0.45 : 1}
            />
          ),
        ),
      )}
    </svg>
  );
}
