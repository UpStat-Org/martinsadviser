import { useLanguage } from "@/contexts/LanguageContext";
import { RISK_BAND_STYLE, bandLabelKey, type RiskBand } from "@/lib/risk";

/**
 * Compact risk chip for list cells and headers: the numeric score on a
 * band-colored pill. Higher score = more risk. The optional `band` label is
 * surfaced via the native tooltip; the full factor breakdown lives in
 * <RiskScorePanel>.
 */
export function RiskBadge({
  score,
  band,
  showLabel = false,
}: {
  score: number;
  band: RiskBand;
  showLabel?: boolean;
}) {
  const { t } = useLanguage();
  const style = RISK_BAND_STYLE[band];
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-xs font-bold tabular-nums ${style.badge}`}
      title={`${t("risk.scoreLabel")}: ${score}/100 — ${t(bandLabelKey(band))}`}
    >
      {score}
      {showLabel && <span className="font-medium opacity-90">{t(bandLabelKey(band))}</span>}
    </span>
  );
}
