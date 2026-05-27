import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";

interface SparklineProps<T> {
  data: T[];
  /** Field selector returning the numeric value for each point. */
  value: (point: T) => number;
  /** Optional tooltip text per point — rendered as `<title>` on each dot. */
  tooltip?: (point: T) => string;
  /** CSS color (e.g. `hsl(var(--primary))`). Defaults to primary. */
  color?: string;
  /** Force a fixed Y-axis domain. Defaults to data-min/data-max with padding. */
  domain?: [number, number];
  /** Show filled gradient under the line. */
  fill?: boolean;
  /** Stroke width. */
  strokeWidth?: number;
  className?: string;
  "aria-label"?: string;
}

/**
 * Lightweight pure-SVG sparkline. A drop-in replacement for the simplest
 * `<AreaChart>` usage from Recharts (no axes, no legend, just a trend
 * shape). Renders 0 JS dependencies and ~1 KB.
 *
 * For interactive multi-series charts with axes/legends/reference lines,
 * keep using Recharts — this is intentionally minimal.
 */
export function Sparkline<T>({
  data,
  value,
  tooltip,
  color = "hsl(var(--primary))",
  domain,
  fill = true,
  strokeWidth = 1.5,
  className,
  "aria-label": ariaLabel,
}: SparklineProps<T>) {
  const gradientId = useId();
  const width = 100;
  const height = 32;

  const { linePath, areaPath, points } = useMemo(() => {
    if (!data.length) return { linePath: "", areaPath: "", points: [] as Array<{ x: number; y: number }> };
    const values = data.map(value);
    const min = domain?.[0] ?? Math.min(...values);
    const max = domain?.[1] ?? Math.max(...values);
    const range = max - min || 1;
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;
    const pts = data.map((d, i) => {
      const x = i * stepX;
      const y = height - ((value(d) - min) / range) * height;
      return { x, y };
    });
    const lp = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    const ap = `${lp} L${pts[pts.length - 1].x.toFixed(2)},${height} L0,${height} Z`;
    return { linePath: lp, areaPath: ap, points: pts };
  }, [data, value, domain]);

  if (!data.length) return null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("block w-full h-full", className)}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      {fill && (
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      {tooltip &&
        points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.4} fill={color}>
            <title>{tooltip(data[i])}</title>
          </circle>
        ))}
    </svg>
  );
}
