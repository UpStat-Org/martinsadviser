import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";
type Tone = "light" | "dark";

interface WordmarkProps {
  size?: Size;
  tone?: Tone;
  className?: string;
  /** Main brand word. Defaults to "Martins" to preserve the original look. */
  primary?: string;
  /** Secondary word after the gold bar. Defaults to "Adviser". */
  secondary?: string;
  /**
   * Hex color overriding the amber gradient on the bar between primary and
   * secondary. Default keeps the original MartinsAdviser amber.
   */
  accentColor?: string | null;
}

const sizeMap: Record<Size, { main: string; sub: string; gap: string; bar: string }> = {
  sm: { main: "text-[13px]", sub: "text-[8px]", gap: "gap-[2px]", bar: "w-3 h-[1.5px]" },
  md: { main: "text-[17px]", sub: "text-[9px]", gap: "gap-[3px]", bar: "w-4 h-[2px]" },
  lg: { main: "text-[22px]", sub: "text-[10px]", gap: "gap-[4px]", bar: "w-5 h-[2px]" },
  xl: { main: "text-[28px]", sub: "text-[11px]", gap: "gap-[5px]", bar: "w-6 h-[2.5px]" },
};

export function Wordmark({
  size = "md",
  tone = "dark",
  className,
  primary = "Martins",
  secondary = "Adviser",
  accentColor,
}: WordmarkProps) {
  const s = sizeMap[size];
  const mainColor = tone === "light" ? "text-white" : "text-foreground";
  const subColor = tone === "light" ? "text-white/55" : "text-muted-foreground";
  const hasSecondary = secondary && secondary.length > 0;

  // The bar between the two lines is the wordmark's visual signature. When
  // the org overrides the accent color, swap the amber gradient for a solid
  // (it doesn't look great as a gradient unless we know the shade variant);
  // otherwise keep the original amber → gold gradient.
  const barStyle = accentColor
    ? { background: accentColor }
    : undefined;
  const barClass = accentColor
    ? "rounded-full shrink-0"
    : "rounded-full shrink-0 bg-gradient-to-r from-[#F59E0B] to-[#FCD34D]";

  return (
    <div className={cn("flex flex-col leading-none select-none", s.gap, className)}>
      <span
        className={cn(
          "font-brand font-bold uppercase",
          s.main,
          mainColor,
        )}
        style={{ letterSpacing: "-0.045em" }}
      >
        {primary}
      </span>
      {hasSecondary && (
        <div className="flex items-center gap-1.5">
          <span className={cn(barClass, s.bar)} style={barStyle} />
          <span
            className={cn(
              "font-sans font-semibold uppercase",
              s.sub,
              subColor,
            )}
            style={{ letterSpacing: "0.32em" }}
          >
            {secondary}
          </span>
        </div>
      )}
    </div>
  );
}

export default Wordmark;
