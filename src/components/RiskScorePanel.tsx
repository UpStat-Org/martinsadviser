import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClientRiskScore, useClientRiskHistory } from "@/hooks/useRiskScores";
import { RISK_BAND_STYLE, bandLabelKey, factorLabel, isAtRisk } from "@/lib/risk";

/**
 * Per-client operational risk panel for the client detail page. Shows the
 * stored risk score, its band, the ranked factor breakdown, and a 30-day
 * trend. Complements <ComplianceScorecard> (which measures master-data
 * completeness) with a forward-looking risk lens.
 */
export function RiskScorePanel({ clientId }: { clientId: string }) {
  const { t } = useLanguage();
  const { data: score, isLoading } = useClientRiskScore(clientId);
  const { data: history } = useClientRiskHistory(clientId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          {t("common.loading")}
        </CardContent>
      </Card>
    );
  }

  // Never scored yet (e.g. job hasn't run since the client was added).
  if (!score) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg">{t("risk.title")}</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
          {t("risk.notScored")}
        </CardContent>
      </Card>
    );
  }

  const style = RISK_BAND_STYLE[score.band];
  const Icon = isAtRisk(score.band) ? ShieldAlert : ShieldCheck;
  const factors = [...(score.factors ?? [])].sort((a, b) => b.points - a.points);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-lg">{t("risk.title")}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{t("risk.subtitle")}</p>
          </div>
          <Badge className={style.badge}>{t(bandLabelKey(score.band))}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className={`flex items-center gap-4 rounded-xl ${style.bg} p-4`}>
          <div className={`w-14 h-14 rounded-xl bg-background ring-2 ${style.ring} flex items-center justify-center shadow-sm`}>
            <Icon className={`w-7 h-7 ${style.text}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className={`font-display text-4xl font-bold tabular-nums ${style.text}`}>{score.score}</span>
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
            <Progress value={score.score} className={`h-1.5 mt-1.5 ${style.progress}`} />
          </div>
          {history && history.length > 1 && (
            <div className="w-24 h-12 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    formatter={(v: number) => [`${v}/100`, t("risk.scoreLabel")]}
                    labelFormatter={(_, p) => (p?.[0]?.payload?.scored_date ?? "")}
                    contentStyle={{ borderRadius: "8px", fontSize: "11px" }}
                  />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {factors.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/30 p-3 text-sm">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span className="text-success">{t("risk.noFactors")}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("risk.factorsTitle")}
            </p>
            <ul className="space-y-1.5">
              {factors.map((f, i) => (
                <li
                  key={`${f.code}-${i}`}
                  className="flex items-center justify-between gap-2 text-sm rounded-lg bg-muted/40 p-2.5 border border-border/40"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                    {factorLabel(t, f)}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-muted-foreground">+{f.points}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
