import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ShieldCheck, ShieldAlert, ShieldX, FileCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Permit } from "@/hooks/usePermits";

interface ComplianceDashboardProps {
  permits: Permit[] | undefined;
}

function getCategory(expirationDate: string | null): "valid" | "expiring" | "expired" {
  if (!expirationDate) return "expired";
  const now = new Date();
  const exp = new Date(expirationDate);
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring";
  return "valid";
}

export function ComplianceDashboard({ permits }: ComplianceDashboardProps) {
  const { t } = useLanguage();

  const metrics = useMemo(() => {
    if (!permits?.length) return null;
    let valid = 0, expiring = 0, expired = 0;
    for (const p of permits) {
      const cat = getCategory(p.expiration_date);
      if (cat === "valid") valid++;
      else if (cat === "expiring") expiring++;
      else expired++;
    }
    const total = permits.length;
    const score = Math.round((valid / total) * 100);
    return { valid, expiring, expired, total, score };
  }, [permits]);

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
          {t("compliance.noPermits")}
        </CardContent>
      </Card>
    );
  }

  const { valid, expiring, expired, total, score } = metrics;

  const level = score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";
  const levelConfig = {
    healthy: { icon: ShieldCheck, colorClass: "text-success", bgClass: "bg-success/10", progressClass: "[&>div]:bg-success", badgeClass: "bg-success text-success-foreground" },
    warning: { icon: ShieldAlert, colorClass: "text-warning", bgClass: "bg-warning/10", progressClass: "[&>div]:bg-warning", badgeClass: "bg-warning text-warning-foreground" },
    critical: { icon: ShieldX, colorClass: "text-destructive", bgClass: "bg-destructive/10", progressClass: "[&>div]:bg-destructive", badgeClass: "bg-destructive text-destructive-foreground" },
  };
  const config = levelConfig[level];
  const Icon = config.icon;

  const chartData = [
    { name: t("compliance.inDate"), value: valid, color: "hsl(var(--success))" },
    { name: t("compliance.expiringSoon"), value: expiring, color: "hsl(var(--warning))" },
    { name: t("compliance.expired"), value: expired, color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0);

  const statCards = [
    { label: t("compliance.total"), value: total, icon: FileCheck, colorClass: "text-muted-foreground" },
    { label: t("compliance.inDate"), value: valid, icon: ShieldCheck, colorClass: "text-success" },
    { label: t("compliance.expiringSoon"), value: expiring, icon: ShieldAlert, colorClass: "text-warning" },
    { label: t("compliance.expired"), value: expired, icon: ShieldX, colorClass: "text-destructive" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg">{t("compliance.title")}</CardTitle>
          <Badge className={config.badgeClass}>{t(`compliance.${level}`)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px] gap-6">
          <div className="space-y-5">
            {/* Score bar */}
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-lg ${config.bgClass}`}>
                <Icon className={`w-6 h-6 ${config.colorClass}`} />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{t("compliance.score")}</span>
                  <span className={`text-2xl font-bold ${config.colorClass}`}>{score}%</span>
                </div>
                <Progress value={score} className={`h-2.5 ${config.progressClass}`} />
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statCards.map((stat) => (
                <div key={stat.label} className="rounded-lg border bg-card p-3 text-center">
                  <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.colorClass}`} />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Donut chart */}
          <div className="flex items-center justify-center">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                  contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
