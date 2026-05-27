import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Beaker, Shuffle, ShieldCheck, Loader2, UserCircle2 } from "lucide-react";
import { useDrivers, type Driver } from "@/hooks/useDrivers";
import {
  useDrugTests,
  useCreateDrugTest,
  useUpdateDrugTest,
  type DrugTestEvent,
} from "@/hooks/useDqf";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit3 } from "lucide-react";
import {
  drawQuarterlySelection,
  currentQuarterTag,
  isDriverInPool,
  type PoolSplit,
} from "@/lib/drugTestingPool";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

const RESULT_STYLE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  negative: "bg-success/10 text-success border-success/30",
  positive: "bg-destructive/10 text-destructive border-destructive/30",
  refused: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export default function DrugTestingPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: drivers } = useDrivers();
  const { data: tests } = useDrugTests();
  const createTest = useCreateDrugTest();
  const updateTest = useUpdateDrugTest();

  const [editTest, setEditTest] = useState<DrugTestEvent | null>(null);
  const [editForm, setEditForm] = useState({
    scheduled_for: "",
    collected_at: "",
    result: "pending" as DrugTestEvent["result"],
    mro_reviewed_now: false,
    notes: "",
  });

  const openEdit = (t: DrugTestEvent) => {
    setEditTest(t);
    setEditForm({
      scheduled_for: t.scheduled_for ?? "",
      collected_at: t.collected_at ? t.collected_at.slice(0, 10) : "",
      result: t.result ?? "pending",
      mro_reviewed_now: !!t.mro_reviewed_at,
      notes: t.notes ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editTest) return;
    const collected = editForm.collected_at ? new Date(editForm.collected_at).toISOString() : null;
    await updateTest.mutateAsync({
      id: editTest.id,
      patch: {
        scheduled_for: editForm.scheduled_for || null,
        collected_at: collected,
        result: editForm.result,
        mro_reviewed_at:
          editForm.mro_reviewed_now && !editTest.mro_reviewed_at
            ? new Date().toISOString()
            : editTest.mro_reviewed_at,
        notes: editForm.notes || null,
      },
    });
    setEditTest(null);
  };

  const quarter = currentQuarterTag();
  const pool = useMemo(() => (drivers ?? []).filter(isDriverInPool), [drivers]);

  const driverById = useMemo(() => {
    const m = new Map<string, Driver>();
    for (const d of drivers ?? []) m.set(d.id, d);
    return m;
  }, [drivers]);

  const quarterTests = useMemo(
    () => (tests ?? []).filter((t) => t.selection_for_quarter === quarter),
    [tests, quarter],
  );
  const alreadySelectedIds = useMemo(
    () => new Set(quarterTests.map((t) => t.driver_id)),
    [quarterTests],
  );

  const [draftSplit, setDraftSplit] = useState<PoolSplit | null>(null);
  const [saving, setSaving] = useState(false);

  const drawNew = () => {
    setDraftSplit(drawQuarterlySelection(drivers ?? [], alreadySelectedIds));
  };

  const confirmSelection = async () => {
    if (!draftSplit || !user) return;
    setSaving(true);
    try {
      const rows = [
        ...draftSplit.drugDrivers.map((d) => ({
          driver_id: d.id,
          user_id: user.id,
          test_type: "random" as const,
          substance: "drug" as const,
          selection_for_quarter: quarter,
          scheduled_for: null,
          collected_at: null,
          result: "pending" as const,
          mro_reviewed_at: null,
          notes: null,
        })),
        ...draftSplit.alcoholDrivers.map((d) => ({
          driver_id: d.id,
          user_id: user.id,
          test_type: "random" as const,
          substance: "alcohol" as const,
          selection_for_quarter: quarter,
          scheduled_for: null,
          collected_at: null,
          result: "pending" as const,
          mro_reviewed_at: null,
          notes: null,
        })),
      ];
      if (rows.length > 0) {
        await createTest.mutateAsync(rows);
      }
      setDraftSplit(null);
    } finally {
      setSaving(false);
    }
  };

  // Annual progress: how many drug/alcohol tests have we logged in the
  // current year vs the FMCSA 50%/10% minimums.
  const year = new Date().getUTCFullYear();
  const yearTests = (tests ?? []).filter((t) => new Date(t.created_at).getUTCFullYear() === year);
  const drugTestsThisYear = yearTests.filter((t) => t.substance === "drug").length;
  const alcoholTestsThisYear = yearTests.filter((t) => t.substance === "alcohol").length;
  const targetDrugAnnual = Math.ceil(pool.length * 0.5);
  const targetAlcoholAnnual = Math.ceil(pool.length * 0.1);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">
        <div className="relative">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2">
            {t("drugTest.section")}
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
            {t("drugTest.title")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-xl">
            {t("drugTest.subtitle")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("drugTest.poolNow")}
            </p>
            <p className="text-xl font-semibold tracking-tight mt-1 tabular-nums">{pool.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("drugTest.poolDesc")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("drugTest.drugYear").replace("{year}", String(year))}
            </p>
            <p className="text-xl font-semibold tracking-tight mt-1 tabular-nums">
              {drugTestsThisYear} <span className="text-base text-muted-foreground font-normal">/ {targetDrugAnnual}</span>
            </p>
            <p className={`text-xs mt-0.5 ${drugTestsThisYear >= targetDrugAnnual ? "text-success" : "text-warning"}`}>
              {drugTestsThisYear >= targetDrugAnnual ? t("drugTest.minMet") : t("drugTest.belowDrug")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("drugTest.alcoholYear").replace("{year}", String(year))}
            </p>
            <p className="text-xl font-semibold tracking-tight mt-1 tabular-nums">
              {alcoholTestsThisYear} <span className="text-base text-muted-foreground font-normal">/ {targetAlcoholAnnual}</span>
            </p>
            <p className={`text-xs mt-0.5 ${alcoholTestsThisYear >= targetAlcoholAnnual ? "text-success" : "text-warning"}`}>
              {alcoholTestsThisYear >= targetAlcoholAnnual ? t("drugTest.minMet") : t("drugTest.belowAlcohol")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quarterly action */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">{quarter}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("drugTest.quarterSelected").replace("{count}", String(quarterTests.length))}
              </p>
            </div>
            <Button onClick={drawNew} disabled={pool.length === 0} className="gap-1.5">
              <Shuffle className="w-4 h-4" />
              {t("drugTest.draw")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {quarterTests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("drugTest.emptyQuarter").replace("{quarter}", quarter)}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("drugTest.col.driver")}</TableHead>
                  <TableHead>{t("drugTest.col.substance")}</TableHead>
                  <TableHead>{t("drugTest.col.result")}</TableHead>
                  <TableHead>{t("drugTest.col.mro")}</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quarterTests.map((ev) => {
                  const d = driverById.get(ev.driver_id);
                  return (
                    <TableRow key={ev.id}>
                      <TableCell>{d?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ev.substance === "drug" ? "bg-violet-500/10 text-violet-600 border-violet-500/30" : "bg-warning/10 text-warning border-warning/30"}>
                          {ev.substance === "drug" ? t("drugTest.subst.drug") : t("drugTest.subst.alcohol")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={RESULT_STYLE[ev.result ?? "pending"]}>
                          {t(`drugTest.result.${ev.result ?? "pending"}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ev.mro_reviewed_at ? format(new Date(ev.mro_reviewed_at), "MMM dd") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(ev)}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MRO entry / result update */}
      <Dialog open={!!editTest} onOpenChange={(v) => !v && setEditTest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("drugTest.editTitle")}
              {editTest && (
                <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                  {driverById.get(editTest.driver_id)?.full_name} · {editTest.substance} · {editTest.test_type}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("drugTest.scheduledFor")}</Label>
                <Input type="date" value={editForm.scheduled_for} onChange={(e) => setEditForm({ ...editForm, scheduled_for: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("drugTest.collectedAt")}</Label>
                <Input type="date" value={editForm.collected_at} onChange={(e) => setEditForm({ ...editForm, collected_at: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("drugTest.resultLabel")}</Label>
              <Select
                value={editForm.result ?? "pending"}
                onValueChange={(v) => setEditForm({ ...editForm, result: v as DrugTestEvent["result"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("drugTest.result.pending")}</SelectItem>
                  <SelectItem value="negative">{t("drugTest.result.negative")}</SelectItem>
                  <SelectItem value="positive">{t("drugTest.result.positive")}</SelectItem>
                  <SelectItem value="refused">{t("drugTest.result.refused")}</SelectItem>
                  <SelectItem value="cancelled">{t("drugTest.result.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.mro_reviewed_now}
                onChange={(e) => setEditForm({ ...editForm, mro_reviewed_now: e.target.checked })}
              />
              {t("drugTest.markMro")}
            </label>

            <div className="space-y-1.5">
              <Label>{t("drugTest.notes")}</Label>
              <Textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTest(null)}>{t("common.cancel")}</Button>
            <Button onClick={saveEdit} disabled={updateTest.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draw preview dialog */}
      <Dialog open={!!draftSplit} onOpenChange={(v) => !v && setDraftSplit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {t("drugTest.drawTitle").replace("{quarter}", quarter)}
            </DialogTitle>
          </DialogHeader>
          {draftSplit && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 border border-border/40 p-3 text-sm">
                <p>
                  {t("drugTest.poolEligible")}: <strong>{draftSplit.poolSize}</strong> {t("drugTest.driversSuffix")} ·{" "}
                  {t("drugTest.subst.drug")}: <strong>{draftSplit.drugCount}</strong> · {t("drugTest.subst.alcohol")}:{" "}
                  <strong>{draftSplit.alcoholCount}</strong>
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  <Beaker className="w-3 h-3 inline mr-1" />
                  {t("drugTest.subst.drug")} ({draftSplit.drugDrivers.length})
                </p>
                <ul className="space-y-1">
                  {draftSplit.drugDrivers.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 text-sm rounded-md bg-muted/30 p-2">
                      <UserCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{d.full_name}</span>
                      {d.cdl_number && <span className="text-xs text-muted-foreground">CDL {d.cdl_number}</span>}
                    </li>
                  ))}
                </ul>
              </div>

              {draftSplit.alcoholDrivers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {t("drugTest.subst.alcohol")} ({draftSplit.alcoholDrivers.length})
                  </p>
                  <ul className="space-y-1">
                    {draftSplit.alcoholDrivers.map((d) => (
                      <li key={d.id} className="flex items-center gap-2 text-sm rounded-md bg-muted/30 p-2">
                        <UserCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{d.full_name}</span>
                        {d.cdl_number && <span className="text-xs text-muted-foreground">CDL {d.cdl_number}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraftSplit(null)}>{t("drugTest.reshuffle")}</Button>
            <Button onClick={confirmSelection} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t("drugTest.confirmRegister")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
