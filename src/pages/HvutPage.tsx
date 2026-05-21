import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, FileCheck, Receipt, AlertCircle, Upload, ExternalLink, Loader2 } from "lucide-react";
import { useTrucks } from "@/hooks/useTrucks";
import { useHvutFilings, useCreateHvutFiling, useUpdateHvutFiling, type HvutFiling } from "@/hooks/useHvut";
import { computeHvutTax, currentTaxYear, filingDeadlineFor } from "@/lib/hvut";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { uploadComplianceDocument } from "@/lib/storage";
import { useDocumentUrl } from "@/hooks/useDocumentUrl";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const STATUS_BADGE: Record<HvutFiling["status"], string> = {
  pending: "bg-muted text-muted-foreground border-border",
  filed: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  amended: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

function Schedule1Cell({ filing }: { filing: HvutFiling }) {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const { t } = useLanguage();
  const updateMut = useUpdateHvutFiling();
  const { data: signedUrl } = useDocumentUrl(filing.schedule_1_url);
  const [busy, setBusy] = useState(false);

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg) return;
    setBusy(true);
    try {
      const path = await uploadComplianceDocument(currentOrg.id, "hvut", filing.id, file);
      if (!path) {
        toast({ title: t("hvut.s1.uploadFailed"), variant: "destructive" });
        return;
      }
      await updateMut.mutateAsync({ id: filing.id, patch: { schedule_1_url: path } });
      toast({ title: t("hvut.s1.toastAttached") });
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  if (filing.schedule_1_url) {
    return (
      <div className="flex items-center gap-1">
        <a
          href={signedUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          {t("hvut.s1.open")}
        </a>
        <label className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
          {t("hvut.s1.replace")}
          <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handlePick} />
        </label>
      </div>
    );
  }
  return (
    <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
      {t("hvut.s1.attach")}
      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handlePick} disabled={busy} />
    </label>
  );
}

export default function HvutPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: trucks } = useTrucks();
  const taxYear = currentTaxYear();
  const { data: filings } = useHvutFilings({ taxYear });
  const createMut = useCreateHvutFiling();
  const updateMut = useUpdateHvutFiling();

  const filedTruckIds = useMemo(() => new Set((filings ?? []).map((f) => f.truck_id)), [filings]);
  const trucksMissing = useMemo(
    () => (trucks ?? []).filter((t) => t.status === "active" && !filedTruckIds.has(t.id)),
    [trucks, filedTruckIds],
  );
  const totalTaxThisYear = useMemo(
    () => (filings ?? []).reduce((sum, f) => sum + Number(f.tax_amount ?? 0), 0),
    [filings],
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    truck_id: "",
    first_used_month: `${taxYear}-07`,
    taxable_gross_weight_lbs: 80_000,
    suspended: false,
  });

  const selectedTruck = trucks?.find((t) => t.id === form.truck_id);
  const previewTax = computeHvutTax(
    form.suspended ? null : form.taxable_gross_weight_lbs,
    form.suspended,
  );
  const deadline = filingDeadlineFor(form.first_used_month);

  const handleSave = async () => {
    if (!user || !form.truck_id || !selectedTruck) return;
    await createMut.mutateAsync({
      truck_id: form.truck_id,
      client_id: selectedTruck.client_id,
      user_id: user.id,
      tax_year: taxYear,
      first_used_month: form.first_used_month,
      taxable_gross_weight_lbs: form.suspended ? null : form.taxable_gross_weight_lbs,
      suspended: form.suspended,
      tax_amount: previewTax,
      status: "pending",
      filed_at: null,
      irs_confirmation: null,
      schedule_1_url: null,
      notes: null,
    });
    setOpen(false);
  };

  const markFiled = (f: HvutFiling) => {
    const today = new Date().toISOString().slice(0, 10);
    updateMut.mutate({
      id: f.id,
      patch: { status: "filed", filed_at: today },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.2em] mb-2">
              {t("hvut.section").replace("{year}", String(taxYear))}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
              {t("hvut.title")}
            </h1>
            <p className="text-white/70 mt-2 text-sm max-w-xl">
              {t("hvut.subtitle")}
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="btn-gradient text-white border-0 gap-1.5">
            <Plus className="w-4 h-4" />
            {t("hvut.newFiling")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("hvut.filingsCount").replace("{year}", String(taxYear))}</p>
            <p className="font-display text-3xl font-bold mt-1 tabular-nums">{filings?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("hvut.filingsCountDesc")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("hvut.missing")}</p>
            <p className="font-display text-3xl font-bold mt-1 tabular-nums">{trucksMissing.length}</p>
            <p className="text-xs text-warning mt-0.5">{t("hvut.missingDesc").replace("{year}", String(taxYear))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("hvut.totalTax")}</p>
            <p className="font-display text-3xl font-bold mt-1 tabular-nums">{usd.format(totalTaxThisYear)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("hvut.totalTaxDesc")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            {t("hvut.tableTitle").replace("{year}", String(taxYear))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!filings?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("hvut.emptyFilings").replace("{year}", String(taxYear))}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("hvut.col.truck")}</TableHead>
                  <TableHead>{t("hvut.col.weight")}</TableHead>
                  <TableHead>{t("hvut.col.suspended")}</TableHead>
                  <TableHead>{t("hvut.col.tax")}</TableHead>
                  <TableHead>{t("hvut.col.status")}</TableHead>
                  <TableHead>{t("hvut.col.filed")}</TableHead>
                  <TableHead>{t("hvut.col.schedule1")}</TableHead>
                  <TableHead className="text-right">{t("hvut.col.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filings.map((f) => {
                  const truck = trucks?.find((t) => t.id === f.truck_id);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        {truck ? truck.plate : "—"}
                        {truck?.vin && <div className="text-[10px] text-muted-foreground font-mono">{truck.vin}</div>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {f.taxable_gross_weight_lbs ? `${f.taxable_gross_weight_lbs.toLocaleString()} lbs` : "—"}
                      </TableCell>
                      <TableCell>
                        {f.suspended ? <Badge variant="outline" className="bg-amber-500/10 text-amber-600">{t("hvut.suspendedYes")}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{usd.format(Number(f.tax_amount ?? 0))}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE[f.status]}>{f.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.filed_at ? format(new Date(f.filed_at), "MMM dd, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <Schedule1Cell filing={f} />
                      </TableCell>
                      <TableCell className="text-right">
                        {f.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => markFiled(f)} className="gap-1.5">
                            <FileCheck className="w-3.5 h-3.5" />
                            {t("hvut.markFiled")}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {trucksMissing.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning" />
              {t("hvut.missingTitle").replace("{year}", String(taxYear)).replace("{count}", String(trucksMissing.length))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {trucksMissing.map((t) => (
                <Badge key={t.id} variant="outline" className="font-mono">
                  {t.plate}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("hvut.dialogTitle").replace("{year}", String(taxYear))}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("hvut.field.truck")}</Label>
              <Select value={form.truck_id} onValueChange={(v) => setForm({ ...form, truck_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("hvut.selectPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {(trucks ?? []).filter((tr) => !filedTruckIds.has(tr.id)).map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {tr.plate}{tr.vin ? ` · VIN ${tr.vin}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("hvut.field.firstUsed")}</Label>
                <Input
                  type="month"
                  value={form.first_used_month}
                  onChange={(e) => setForm({ ...form, first_used_month: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground">
                  {t("hvut.field.deadline").replace("{date}", deadline)}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>{t("hvut.field.weight")}</Label>
                <Input
                  type="number"
                  disabled={form.suspended}
                  value={form.taxable_gross_weight_lbs}
                  onChange={(e) => setForm({ ...form, taxable_gross_weight_lbs: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div>
                <Label className="cursor-pointer">{t("hvut.field.suspendedTitle")}</Label>
                <p className="text-[10px] text-muted-foreground">{t("hvut.field.suspendedDesc")}</p>
              </div>
              <Switch checked={form.suspended} onCheckedChange={(v) => setForm({ ...form, suspended: v })} />
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
              <p className="text-xs text-muted-foreground">{t("hvut.taxEstimate")}</p>
              <p className="font-display text-2xl font-bold tabular-nums">{usd.format(previewTax)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!form.truck_id || createMut.isPending}>
              {t("hvut.register")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
