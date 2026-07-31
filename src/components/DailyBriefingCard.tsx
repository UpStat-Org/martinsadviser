import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, ArrowRight, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Briefing, BriefingPriority } from "@/hooks/useAiBriefing";

const severityStyles: Record<BriefingPriority["severity"], string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-sky-500/10 text-sky-600 border-sky-500/20",
};

interface Props {
  briefing: Briefing | undefined;
  isLoading: boolean;
  error: Error | null;
  onRegenerate: () => Promise<void>;
  /** Routes the operator to the ActionItem a priority points at. */
  onOpen: (refId: string) => void;
}

/**
 * The narrative layer above MyDesk's queue: what to do first, and what happens
 * if you don't. Renders nothing when the queue is empty — an empty desk needs
 * no briefing, and the card would just be noise.
 */
export function DailyBriefingCard({ briefing, isLoading, error, onRegenerate, onOpen }: Props) {
  const { t } = useLanguage();
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  if (briefing?.empty) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("briefing.title")}
              </div>
              {briefing?.headline && (
                <div className="text-sm sm:text-base font-bold truncate">{briefing.headline}</div>
              )}
            </div>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={isLoading || regenerating}
            title={t("briefing.regenerate")}
            className="h-8 px-2.5 rounded-md bg-muted hover:bg-muted/80 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{t("briefing.regenerate")}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{t("briefing.error")}</span>
          </div>
        ) : (
          <>
            {briefing?.summary && (
              <p className="text-sm text-muted-foreground mb-3">{briefing.summary}</p>
            )}

            <div className="space-y-2">
              {(briefing?.priorities ?? []).map((p, i) => (
                <div
                  key={`${p.ref_id ?? "p"}-${i}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-md border border-border/60 bg-background/60"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="text-xs font-bold text-muted-foreground mt-0.5 w-4 shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.why}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end shrink-0">
                    <Badge variant="outline" className={severityStyles[p.severity]}>
                      {t(`briefing.severity.${p.severity}`)}
                    </Badge>
                    {p.ref_id && (
                      <button
                        onClick={() => onOpen(p.ref_id!)}
                        className="h-8 px-2.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1"
                      >
                        {t("common.open")}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground mt-3">{t("briefing.disclaimer")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
