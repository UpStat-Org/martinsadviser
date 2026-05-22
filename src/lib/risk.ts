// Compliance risk score — frontend presentation helpers.
//
// The score itself (0-100, higher = worse), its band, and the factor
// breakdown are all computed server-side by the compute-risk-scores Edge
// Function and stored in compliance_risk_scores. This module only maps those
// stored values to colors and translatable labels — it never recomputes the
// score. Keep the band thresholds here in sync with bandFor() in the function.

export type RiskBand = "low" | "medium" | "high" | "critical";

export interface RiskFactor {
  code: string;
  count: number;
  points: number;
}

export const RISK_BANDS: RiskBand[] = ["critical", "high", "medium", "low"];

const BAND_RANK: Record<RiskBand, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export function isAtRisk(band: RiskBand): boolean {
  return BAND_RANK[band] >= BAND_RANK.high;
}

export function compareBandsDesc(a: RiskBand, b: RiskBand): number {
  return BAND_RANK[b] - BAND_RANK[a];
}

// Tailwind classes per band, reusing the design-system semantic colors.
// `progress` must be a *literal* arbitrary variant so Tailwind's JIT emits it
// — don't compose it from `dot` at runtime.
export const RISK_BAND_STYLE: Record<
  RiskBand,
  { badge: string; text: string; bg: string; ring: string; dot: string; progress: string }
> = {
  low: {
    badge: "bg-success text-success-foreground",
    text: "text-success",
    bg: "bg-success/10",
    ring: "ring-success/40",
    dot: "bg-success",
    progress: "[&>div]:bg-success",
  },
  medium: {
    badge: "bg-warning text-warning-foreground",
    text: "text-warning",
    bg: "bg-warning/10",
    ring: "ring-warning/40",
    dot: "bg-warning",
    progress: "[&>div]:bg-warning",
  },
  high: {
    badge: "bg-destructive/80 text-destructive-foreground",
    text: "text-destructive",
    bg: "bg-destructive/10",
    ring: "ring-destructive/30",
    dot: "bg-destructive/80",
    progress: "[&>div]:bg-destructive/80",
  },
  critical: {
    badge: "bg-destructive text-destructive-foreground",
    text: "text-destructive",
    bg: "bg-destructive/15",
    ring: "ring-destructive/50",
    dot: "bg-destructive",
    progress: "[&>div]:bg-destructive",
  },
};

// translation key for a band label, e.g. risk.band.critical
export function bandLabelKey(band: RiskBand): string {
  return `risk.band.${band}`;
}

// translation key for a factor code, e.g. risk.factor.permit_expired.
// Unknown codes fall back to the raw code so a newly-added server factor still
// renders something legible before its translation lands.
export function factorLabel(t: (key: string) => string, factor: RiskFactor): string {
  const key = `risk.factor.${factor.code}`;
  const label = t(key);
  const text = label === key ? factor.code : label;
  return text.replace("{count}", String(factor.count));
}
