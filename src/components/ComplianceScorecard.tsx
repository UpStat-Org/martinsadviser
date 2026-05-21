import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldAlert, ShieldCheck, ShieldX, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  computeScorecard,
  type ScorecardIssue,
  type ScorecardLevel,
  type ScorecardResult,
} from "@/lib/scorecard";
import type { Client } from "@/hooks/useClients";
import type { Truck } from "@/hooks/useTrucks";
import type { Permit } from "@/hooks/usePermits";

interface ComplianceScorecardProps {
  client: Client;
  trucks: Truck[] | undefined;
  permits: Permit[] | undefined;
}

const LEVEL_STYLE: Record<
  ScorecardLevel,
  { icon: typeof ShieldCheck; ring: string; text: string; bg: string; badge: string; progress: string }
> = {
  healthy: {
    icon: ShieldCheck,
    ring: "ring-success/40",
    text: "text-success",
    bg: "bg-success/10",
    badge: "bg-success text-success-foreground",
    progress: "[&>div]:bg-success",
  },
  warning: {
    icon: ShieldAlert,
    ring: "ring-warning/40",
    text: "text-warning",
    bg: "bg-warning/10",
    badge: "bg-warning text-warning-foreground",
    progress: "[&>div]:bg-warning",
  },
  critical: {
    icon: ShieldX,
    ring: "ring-destructive/40",
    text: "text-destructive",
    bg: "bg-destructive/10",
    badge: "bg-destructive text-destructive-foreground",
    progress: "[&>div]:bg-destructive",
  },
};

function renderIssue(issue: ScorecardIssue, t: (key: string) => string): string {
  switch (issue.kind) {
    case "service_uncovered":
      return t("scorecard.issue.serviceUncovered").replace("{service}", issue.service);
    case "truck_incomplete":
      return t("scorecard.issue.truckIncomplete").replace("{count}", String(issue.count));
    case "doc_missing":
      return t("scorecard.issue.docMissing").replace("{field}", issue.field);
    case "permit_expired":
      return t("scorecard.issue.permitExpired").replace("{count}", String(issue.count));
    case "permit_expiring":
      return t("scorecard.issue.permitExpiring").replace("{count}", String(issue.count));
  }
}

export function ComplianceScorecard({ client, trucks, permits }: ComplianceScorecardProps) {
  const { t } = useLanguage();
  const result = computeScorecard(client, trucks ?? [], permits ?? []);
  const style = LEVEL_STYLE[result.level];
  const Icon = style.icon;

  const dimensions: Array<{ label: string; value: number }> = [
    { label: t("scorecard.breakdown.services"), value: result.breakdown.services },
    { label: t("scorecard.breakdown.trucks"), value: result.breakdown.trucks },
    { label: t("scorecard.breakdown.docs"), value: result.breakdown.docs },
    { label: t("scorecard.breakdown.expiration"), value: result.breakdown.expiration },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-lg">{t("scorecard.title")}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{t("scorecard.subtitle")}</p>
          </div>
          <Badge className={style.badge}>{t(`compliance.${result.level}`)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Big score */}
        <div className={`flex items-center gap-4 rounded-xl ${style.bg} p-4`}>
          <div className={`w-14 h-14 rounded-xl bg-background ring-2 ${style.ring} flex items-center justify-center shadow-sm`}>
            <Icon className={`w-7 h-7 ${style.text}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className={`font-display text-4xl font-bold tabular-nums ${style.text}`}>{result.score}</span>
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
            <Progress value={result.score} className={`h-1.5 mt-1.5 ${style.progress}`} />
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dimensions.map((d) => (
            <div key={d.label} className="rounded-lg border border-border/50 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">{d.label}</span>
                <span className="text-xs font-bold tabular-nums">{d.value}%</span>
              </div>
              <Progress value={d.value} className="h-1" />
            </div>
          ))}
        </div>

        {/* Issues */}
        {result.issues.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/30 p-3 text-sm">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span className="text-success">{t("scorecard.allGood")}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("scorecard.missing")}
            </p>
            <ul className="space-y-1.5">
              {result.issues.map((issue, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm rounded-lg bg-muted/40 p-2.5 border border-border/40"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                  <span>{renderIssue(issue, t)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact score chip suitable for a list cell. Pass the same data you'd give
 * to `<ComplianceScorecard>`. Renders just the number + colored badge.
 */
export function ScoreBadge({
  client,
  trucks,
  permits,
}: {
  client: Client;
  trucks: Truck[] | undefined;
  permits: Permit[] | undefined;
}) {
  const result: ScorecardResult = computeScorecard(client, trucks ?? [], permits ?? []);
  const style = LEVEL_STYLE[result.level];
  return (
    <span
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-bold tabular-nums ${style.badge}`}
      title={`${result.score}/100`}
    >
      {result.score}
    </span>
  );
}
