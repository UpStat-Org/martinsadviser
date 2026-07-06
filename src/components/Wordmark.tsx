import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";
type Tone = "light" | "dark";

interface WordmarkProps {
  size?: Size;
  tone?: Tone;
  className?: string;
  /** Main brand word. */
  primary?: string;
  /** Secondary word (shown after a separator). */
  secondary?: string;
  /** Hex color used for the separator dot when set. Defaults to the theme accent. */
  accentColor?: string | null;
}

// CRM wordmark: a single inline name, neutral sans, with a tiny accent dot
// separating the two halves when both are provided. No display font, no
// uppercase, no decorative bar — the page chrome is supposed to be calm.
const sizeMap: Record<Size, { main: string; sub: string; dot: string }> = {
  sm: { main: "text-[13px]", sub: "text-[12px]", dot: "w-1 h-1" },
  md: { main: "text-[15px]", sub: "text-[14px]", dot: "w-1.5 h-1.5" },
  lg: { main: "text-[18px]", sub: "text-[16px]", dot: "w-1.5 h-1.5" },
  xl: { main: "text-[22px]", sub: "text-[18px]", dot: "w-2 h-2" },
};

export function Wordmark({
  size = "md",
  tone = "dark",
  className,
  primary = "Dot",
  secondary = "Pilot",
  accentColor,
}: WordmarkProps) {
  const s = sizeMap[size];
  const mainColor = tone === "light" ? "text-white" : "text-foreground";
  const subColor = tone === "light" ? "text-white/65" : "text-muted-foreground";
  const hasSecondary = !!secondary && secondary.length > 0;

  const dotStyle = accentColor ? { backgroundColor: accentColor } : undefined;
  const dotClass = accentColor ? "rounded-full shrink-0" : "rounded-full shrink-0 bg-accent";

  return (
    <div className={cn("flex items-baseline gap-1.5 leading-none select-none min-w-0", className)}>
      <span className={cn("font-semibold tracking-tight truncate", s.main, mainColor)}>
        {primary}
      </span>
      {hasSecondary && (
        <>
          <span className={cn(dotClass, s.dot, "self-center")} style={dotStyle} aria-hidden />
          <span className={cn("font-medium tracking-tight truncate", s.sub, subColor)}>
            {secondary}
          </span>
        </>
      )}
    </div>
  );
}

export default Wordmark;
