import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { ShieldAlert, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useCsaSnapshots, useUpsertCsaSnapshot, type CsaSnapshot } from "@/hooks/useCsa";
import { BASICS, scoreLevel, type Basic } from "@/lib/csa";
import { format } from "date-fns";

const LEVEL_BADGE: Record<"ok" | "watch" | "alert", string> = {
  ok: "bg-success/10 text-success border-success/30",
  watch: "bg-warning/10 text-warning border-warning/30",
  alert: "bg-destructive/10 text-destructive border-destructive/30",
};

export function CsaScoresCard({ clientId }: { clientId: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: snapshots } = useCsaSnapshots(clientId);
  const upsert = useUpsertCsaSnapshot();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<Basic | "measurement_period" | "notes", string>>({
    measurement_period: new Date().toISOString().slice(0, 7) + "-01",
    unsafe_driving: "",
    hours_of_service: "",
    driver_fitness: "",
    controlled_substances: "",
    vehicle_maintenance: "",
    hazmat_compliance: "",
    crash_indicator: "",
    notes: "",
  });

  const latest = snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  const chartData = useMemo(() => {
    return (snapshots ?? []).map((s) => ({
      period: s.measurement_period.slice(0, 7), // YYYY-MM
      unsafe_driving: s.unsafe_driving ?? null,
      hours_of_service: s.hours_of_service ?? null,
      driver_fitness: s.driver_fitness ?? null,
      controlled_substances: s.controlled_substances ?? null,
      vehicle_maintenance: s.vehicle_maintenance ?? null,
      hazmat_compliance: s.hazmat_compliance ?? null,
      crash_indicator: s.crash_indicator ?? null,
    }));
  }, [snapshots]);

  const parseScore = (v: string): number | null => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };

  const save = async () => {
    if (!user) return;
    await upsert.mutateAsync({
      client_id: clientId,
      user_id: user.id,
      measurement_period: form.measurement_period,
      unsafe_driving: parseScore(form.unsafe_driving),
      hours_of_service: parseScore(form.hours_of_service),
      driver_fitness: parseScore(form.driver_fitness),
      controlled_substances: parseScore(form.controlled_substances),
      vehicle_maintenance: parseScore(form.vehicle_maintenance),
      hazmat_compliance: parseScore(form.hazmat_compliance),
      crash_indicator: parseScore(form.crash_indicator),
      notes: form.notes || null,
    });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{t("csa.title")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("csa.subtitle")}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {t("csa.addSnapshot")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {!latest ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("csa.empty")}</p>
        ) : (
          <>
            {/* Current snapshot — grid of 7 BASICs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {BASICS.map((b) => {
                const value = latest[b.key] as number | null;
                const level = scoreLevel(value, b.threshold);
                return (
                  <div key={b.key} className="rounded-lg border border-border/50 p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                      {t(b.labelKey)}
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-bold tabular-nums">
                        {value != null ? value.toFixed(1) : "—"}
                      </span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${LEVEL_BADGE[level]}`}>
                      {t(`csa.level.${level}`)} · {t("csa.threshold").replace("{value}", String(b.threshold))}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {/* Trend chart */}
            {chartData.length >= 2 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("csa.trend")}
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <ReferenceLine y={65} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                      <ReferenceLine y={80} stroke="hsl(var(--warning))" strokeDasharray="3 3" />
                      {BASICS.map((b) => (
                        <Line
                          key={b.key}
                          type="monotone"
                          dataKey={b.key}
                          stroke={b.color}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                          name={t(b.labelKey)}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              {t("csa.current")}: {format(new Date(latest.measurement_period), "MMM yyyy")}
            </p>
          </>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("csa.addSnapshot")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("csa.period")}</Label>
              <Input
                type="month"
                value={form.measurement_period.slice(0, 7)}
                onChange={(e) => setForm({ ...form, measurement_period: e.target.value + "-01" })}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">{t("csa.dialogHint")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BASICS.map((b) => (
                <div key={b.key} className="space-y-1.5">
                  <Label className="text-xs">{t(b.labelKey)}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={form[b.key]}
                    onChange={(e) => setForm({ ...form, [b.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={upsert.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
