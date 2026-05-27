import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, MapPin, Trash2 } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import {
  useIrpRegistrations,
  useIrpLines,
  useUpsertIrpRegistration,
  useUpsertIrpLine,
  useDeleteIrpLine,
  type IrpRegistration,
} from "@/hooks/useIrp";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const STATUS_BADGE: Record<IrpRegistration["status"], string> = {
  draft: "bg-muted text-muted-foreground border-border",
  filed: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  paid: "bg-success/10 text-success border-success/30",
};

const availableYears = (() => {
  const y = new Date().getUTCFullYear();
  return [y - 1, y, y + 1];
})();

export default function IrpPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState("");
  const [year, setYear] = useState(new Date().getUTCFullYear());

  const { data: registrations } = useIrpRegistrations({ clientId, year });
  const registration = registrations && registrations.length > 0 ? registrations[0] : null;
  const { data: lines } = useIrpLines(registration?.id);
  const upsertReg = useUpsertIrpRegistration();
  const upsertLine = useUpsertIrpLine();
  const deleteLine = useDeleteIrpLine();

  const [regOpen, setRegOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    base_jurisdiction: "",
    total_fleet_miles: 0,
    fleet_size: 0,
    status: "draft" as IrpRegistration["status"],
    total_fee: 0,
    notes: "",
  });
  const [lineOpen, setLineOpen] = useState(false);
  const [lineForm, setLineForm] = useState({ jurisdiction: "", miles: 0, fee: 0 });

  const totalMiles = registration?.total_fleet_miles ?? 0;
  const linesWithPct = useMemo(() => {
    return (lines ?? []).map((l) => ({
      ...l,
      pct: totalMiles > 0 ? (Number(l.miles) / Number(totalMiles)) * 100 : 0,
    }));
  }, [lines, totalMiles]);
  const totalFee = useMemo(() => (lines ?? []).reduce((s, l) => s + Number(l.fee ?? 0), 0), [lines]);

  const saveReg = async () => {
    if (!user || !clientId) return;
    await upsertReg.mutateAsync({
      client_id: clientId,
      user_id: user.id,
      registration_year: year,
      base_jurisdiction: regForm.base_jurisdiction.toUpperCase(),
      total_fleet_miles: regForm.total_fleet_miles,
      fleet_size: regForm.fleet_size,
      status: regForm.status,
      filed_at: regForm.status === "filed" || regForm.status === "paid" ? new Date().toISOString().slice(0, 10) : null,
      total_fee: regForm.total_fee || null,
      notes: regForm.notes || null,
    });
    setRegOpen(false);
  };

  const saveLine = async () => {
    if (!registration) return;
    const pct = totalMiles > 0 ? lineForm.miles / Number(totalMiles) : null;
    await upsertLine.mutateAsync({
      registration_id: registration.id,
      jurisdiction: lineForm.jurisdiction.toUpperCase(),
      miles: lineForm.miles,
      percentage: pct,
      fee: lineForm.fee || null,
    });
    setLineOpen(false);
    setLineForm({ jurisdiction: "", miles: 0, fee: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">
        <div className="relative">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2">IRP</p>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">{t("irp.title")}</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl">{t("irp.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t("irp.client")}</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder={t("ifta.clientPlaceholder")} /></SelectTrigger>
            <SelectContent>
              {(clients ?? []).map((c) => (<SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("irp.year")}</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!clientId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">{t("irp.selectClient")}</CardContent></Card>
      ) : !registration ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Button onClick={() => { setRegForm({ base_jurisdiction: "", total_fleet_miles: 0, fleet_size: 0, status: "draft", total_fee: 0, notes: "" }); setRegOpen(true); }} className="gap-1.5">
              <Plus className="w-4 h-4" />
              {t("irp.newRegistration")} {year}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("irp.baseJuris")}</p>
                <p className="text-lg font-semibold tabular-nums mt-1">{registration.base_jurisdiction || "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("irp.totalMiles")}</p>
                <p className="text-lg font-semibold tabular-nums mt-1">{Number(registration.total_fleet_miles).toFixed(0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("irp.fleetSize")}</p>
                <p className="text-lg font-semibold tabular-nums mt-1">{registration.fleet_size}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("irp.totalFee")}</p>
                <p className="text-lg font-semibold tabular-nums mt-1">{usd.format(totalFee)}</p>
                <Badge variant="outline" className={`mt-1 ${STATUS_BADGE[registration.status]}`}>{t(`irp.status.${registration.status}`)}</Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {t("irp.linesTitle")} ({linesWithPct.length})
                </CardTitle>
                <Button size="sm" onClick={() => { setLineForm({ jurisdiction: "", miles: 0, fee: 0 }); setLineOpen(true); }} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  {t("irp.addJuris")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {linesWithPct.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("irp.linesEmpty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("irp.col.juris")}</TableHead>
                      <TableHead className="text-right">{t("irp.col.miles")}</TableHead>
                      <TableHead className="text-right">{t("irp.col.pct")}</TableHead>
                      <TableHead className="text-right">{t("irp.col.fee")}</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linesWithPct.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono font-semibold">{l.jurisdiction}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(l.miles).toFixed(0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.pct.toFixed(2)}%</TableCell>
                        <TableCell className="text-right tabular-nums">{l.fee != null ? usd.format(Number(l.fee)) : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => deleteLine.mutate(l.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">{t("irp.percentHint")}</p>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRegForm({
                base_jurisdiction: registration.base_jurisdiction,
                total_fleet_miles: Number(registration.total_fleet_miles),
                fleet_size: registration.fleet_size,
                status: registration.status,
                total_fee: Number(registration.total_fee ?? 0),
                notes: registration.notes ?? "",
              });
              setRegOpen(true);
            }}
          >
            {t("common.edit")}
          </Button>
        </>
      )}

      {/* Reg dialog */}
      <Dialog open={regOpen} onOpenChange={setRegOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("irp.dialogTitleReg")} {year}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("irp.baseJuris")}</Label>
                <Input maxLength={3} value={regForm.base_jurisdiction} onChange={(e) => setRegForm({ ...regForm, base_jurisdiction: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("irp.fleetSize")}</Label>
                <Input type="number" value={regForm.fleet_size} onChange={(e) => setRegForm({ ...regForm, fleet_size: parseInt(e.target.value, 10) || 0 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("irp.totalMiles")}</Label>
              <Input type="number" value={regForm.total_fleet_miles} onChange={(e) => setRegForm({ ...regForm, total_fleet_miles: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("irp.status")}</Label>
                <Select value={regForm.status} onValueChange={(v) => setRegForm({ ...regForm, status: v as IrpRegistration["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t("irp.status.draft")}</SelectItem>
                    <SelectItem value="filed">{t("irp.status.filed")}</SelectItem>
                    <SelectItem value="paid">{t("irp.status.paid")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("irp.totalFee")}</Label>
                <Input type="number" step="0.01" value={regForm.total_fee} onChange={(e) => setRegForm({ ...regForm, total_fee: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRegOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveReg} disabled={upsertReg.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Line dialog */}
      <Dialog open={lineOpen} onOpenChange={setLineOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("irp.dialogTitleLine")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t("ifta.fuelJuris")}</Label>
                <Input maxLength={3} value={lineForm.jurisdiction} onChange={(e) => setLineForm({ ...lineForm, jurisdiction: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("irp.col.miles")}</Label>
                <Input type="number" value={lineForm.miles} onChange={(e) => setLineForm({ ...lineForm, miles: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("irp.field.fee")}</Label>
                <Input type="number" step="0.01" value={lineForm.fee} onChange={(e) => setLineForm({ ...lineForm, fee: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLineOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveLine} disabled={!lineForm.jurisdiction || upsertLine.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
