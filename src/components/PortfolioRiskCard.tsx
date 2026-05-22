import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ShieldCheck, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRiskScores } from "@/hooks/useRiskScores";
import { RiskBadge } from "@/components/RiskBadge";
import { factorLabel, isAtRisk } from "@/lib/risk";

/**
 * Dashboard widget: the carteira ranked by operational risk. Surfaces the
 * clients in the high/critical bands first, with their top contributing
 * factor, so the team sees "who's going to be a problem" at a glance.
 */
export function PortfolioRiskCard({ limit = 6 }: { limit?: number }) {
  const { t } = useLanguage();
  const { data: scores, isLoading } = useRiskScores();

  const atRisk = (scores ?? []).filter((s) => isAtRisk(s.band));
  const top = atRisk.slice(0, limit);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            {t("risk.portfolioTitle")}
          </CardTitle>
          {atRisk.length > 0 && (
            <span className="text-sm font-bold tabular-nums text-destructive">{atRisk.length}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : top.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-success opacity-70" />
            {t("risk.portfolioEmpty")}
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {top.map((s) => {
              const topFactor = [...(s.factors ?? [])].sort((a, b) => b.points - a.points)[0];
              return (
                <li key={s.client_id}>
                  <Link
                    to={`/clients/${s.client_id}`}
                    className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <RiskBadge score={s.score} band={s.band} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.clients?.company_name ?? "—"}</p>
                      {topFactor && (
                        <p className="text-xs text-muted-foreground truncate">{factorLabel(t, topFactor)}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
