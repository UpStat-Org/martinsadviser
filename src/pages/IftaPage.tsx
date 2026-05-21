import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Save, Fuel, MapIcon, Calculator, Trash2 } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import {
  useIftaTrips,
  useCreateIftaTrip,
  useDeleteIftaTrip,
  useIftaFuel,
  useCreateIftaFuel,
  useDeleteIftaFuel,
  useIftaRates,
  useUpsertIftaFiling,
} from "@/hooks/useIfta";
import { summarizeIfta, quarterFromDate } from "@/lib/ifta";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function parseJurisdictionsString(s: string): Record<string, number> {
  // "TX:250, NM:180" → { TX: 250, NM: 180 }
  const result: Record<string, number> = {};
  for (const part of s.split(",")) {
    const [code, val] = part.split(":");
    if (!code || !val) continue;
    const n = parseFloat(val.trim());
    if (Number.isFinite(n)) result[code.trim().toUpperCase()] = n;
  }
  return result;
}

function formatJurisdictionsObj(obj: Record<string, number>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");
}

const availableQuarters = (() => {
  const list: string[] = [];
  const now = new Date();
  for (let i = -3; i <= 1; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i * 3, 1));
    list.push(quarterFromDate(d));
  }
  return Array.from(new Set(list));
})();

export default function IftaPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState<string>("");
  const [quarter, setQuarter] = useState<string>(quarterFromDate(new Date()));

  const { data: trips } = useIftaTrips({ clientId, quarter });
  const { data: fuel } = useIftaFuel({ clientId, quarter });
  const { data: rates } = useIftaRates(quarter);
  const createTrip = useCreateIftaTrip();
  const deleteTrip = useDeleteIftaTrip();
  const createFuel = useCreateIftaFuel();
  const deleteFuel = useDeleteIftaFuel();
  const upsertFiling = useUpsertIftaFiling();

  const summary = useMemo(() => {
    if (!clientId) return null;
    return summarizeIfta(
      (trips ?? []).map((t) => ({
        total_miles: Number(t.total_miles),
        miles_by_jurisdiction: t.miles_by_jurisdiction ?? {},
      })),
      (fuel ?? []).map((f) => ({
        jurisdiction: f.jurisdiction,
        gallons: Number(f.gallons),
      })),
      (rates ?? []).map((r) => ({
        jurisdiction: r.jurisdiction,
        rate_per_gallon: Number(r.rate_per_gallon),
      })),
    );
  }, [trips, fuel, rates, clientId]);

  const [tripOpen, setTripOpen] = useState(false);
  const [tripForm, setTripForm] = useState({ trip_date: "", total_miles: 0, jurisdictions: "TX:0", truck_id: "", notes: "" });
  const [fuelOpen, setFuelOpen] = useState(false);
  const [fuelForm, setFuelForm] = useState({ purchase_date: "", jurisdiction: "TX", gallons: 0, gross_price: 0, truck_id: "", notes: "" });

  const saveDraftFiling = async () => {
    if (!summary || !user || !clientId) return;
    await upsertFiling.mutateAsync({
      client_id: clientId,
      user_id: user.id,
      quarter,
      total_miles: summary.total_miles,
      total_gallons: summary.total_gallons,
      fleet_mpg: summary.fleet_mpg,
      breakdown_by_jurisdiction: summary.by_jurisdiction as unknown,
      total_tax_due: summary.total_net_tax,
      status: "draft",
    });
  };

  const handleAddTrip = async () => {
    if (!user || !clientId) return;
    const miles_by_jurisdiction = parseJurisdictionsString(tripForm.jurisdictions);
    const computedTotal = Object.values(miles_by_jurisdiction).reduce((a, b) => a + b, 0);
    await createTrip.mutateAsync({
      client_id: clientId,
      truck_id: tripForm.truck_id || null,
      user_id: user.id,
      trip_date: tripForm.trip_date,
      quarter,
      total_miles: tripForm.total_miles || computedTotal,
      miles_by_jurisdiction,
      notes: tripForm.notes || null,
    });
    setTripOpen(false);
    setTripForm({ trip_date: "", total_miles: 0, jurisdictions: "TX:0", truck_id: "", notes: "" });
  };

  const handleAddFuel = async () => {
    if (!user || !clientId) return;
    await createFuel.mutateAsync({
      client_id: clientId,
      truck_id: fuelForm.truck_id || null,
      user_id: user.id,
      purchase_date: fuelForm.purchase_date,
      quarter,
      jurisdiction: fuelForm.jurisdiction.toUpperCase(),
      gallons: fuelForm.gallons,
      gross_price: fuelForm.gross_price || null,
      receipt_url: null,
      notes: fuelForm.notes || null,
    });
    setFuelOpen(false);
    setFuelForm({ purchase_date: "", jurisdiction: "TX", gallons: 0, gross_price: 0, truck_id: "", notes: "" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />
        <div className="relative">
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.2em] mb-2">
            {t("ifta.section")}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
            {t("ifta.title")}
          </h1>
          <p className="text-white/70 mt-2 text-sm max-w-2xl">
            {t("ifta.subtitle")}
          </p>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t("ifta.client")}</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder={t("ifta.clientPlaceholder")} /></SelectTrigger>
            <SelectContent>
              {(clients ?? []).filter((c) => c.service_ifta).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("ifta.quarter")}</Label>
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableQuarters.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!clientId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          {t("ifta.selectClient")}
        </CardContent></Card>
      ) : (
        <>
          {/* Summary stats */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("ifta.stats.miles")}</p>
                  <p className="font-display text-2xl font-bold tabular-nums">{summary.total_miles.toFixed(0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("ifta.stats.gallons")}</p>
                  <p className="font-display text-2xl font-bold tabular-nums">{summary.total_gallons.toFixed(1)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("ifta.stats.mpg")}</p>
                  <p className="font-display text-2xl font-bold tabular-nums">{summary.fleet_mpg.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("ifta.stats.netTax")}</p>
                  <p className={`font-display text-2xl font-bold tabular-nums ${summary.total_net_tax >= 0 ? "text-destructive" : "text-success"}`}>
                    {usd.format(summary.total_net_tax)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Breakdown table */}
          {summary && summary.by_jurisdiction.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  {t("ifta.breakdownTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ifta.col.juris")}</TableHead>
                      <TableHead className="text-right">{t("ifta.col.miles")}</TableHead>
                      <TableHead className="text-right">{t("ifta.col.taxableGallons")}</TableHead>
                      <TableHead className="text-right">{t("ifta.col.taxOwed")}</TableHead>
                      <TableHead className="text-right">{t("ifta.col.taxPaid")}</TableHead>
                      <TableHead className="text-right">{t("ifta.col.net")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.by_jurisdiction.map((b) => (
                      <TableRow key={b.jurisdiction}>
                        <TableCell className="font-mono">{b.jurisdiction}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.taxable_miles.toFixed(0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.taxable_gallons.toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums">{usd.format(b.tax_owed)}</TableCell>
                        <TableCell className="text-right tabular-nums">{usd.format(b.tax_paid)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${b.net >= 0 ? "text-destructive" : "text-success"}`}>
                          {usd.format(b.net)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end mt-4">
                  <Button onClick={saveDraftFiling} disabled={upsertFiling.isPending} className="gap-1.5">
                    <Save className="w-4 h-4" />
                    {t("ifta.saveDraft")}
                  </Button>
                </div>

                {rates?.length === 0 && (
                  <p className="text-xs text-warning mt-3">
                    {t("ifta.noRatesWarning").replace("{quarter}", quarter)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Trips */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <MapIcon className="w-4 h-4" />
                  {t("ifta.tripsTitle").replace("{count}", String(trips?.length ?? 0))}
                </CardTitle>
                <Button size="sm" onClick={() => setTripOpen(true)} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  {t("ifta.tripBtn")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!trips?.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("ifta.tripsEmpty").replace("{quarter}", quarter)}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ifta.col.date")}</TableHead>
                      <TableHead>{t("ifta.col.miles")}</TableHead>
                      <TableHead>{t("ifta.col.byJuris")}</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trips.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs">{format(new Date(t.trip_date), "MMM dd")}</TableCell>
                        <TableCell className="tabular-nums">{Number(t.total_miles).toFixed(0)}</TableCell>
                        <TableCell className="text-xs font-mono">{formatJurisdictionsObj(t.miles_by_jurisdiction ?? {})}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => deleteTrip.mutate(t.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Fuel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Fuel className="w-4 h-4" />
                  {t("ifta.fuelTitle").replace("{count}", String(fuel?.length ?? 0))}
                </CardTitle>
                <Button size="sm" onClick={() => setFuelOpen(true)} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  {t("ifta.fuelBtn")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!fuel?.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("ifta.fuelEmpty").replace("{quarter}", quarter)}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ifta.col.date")}</TableHead>
                      <TableHead>{t("ifta.col.juris")}</TableHead>
                      <TableHead>{t("ifta.col.gallons")}</TableHead>
                      <TableHead>{t("ifta.col.price")}</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuel.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-xs">{format(new Date(f.purchase_date), "MMM dd")}</TableCell>
                        <TableCell className="font-mono">{f.jurisdiction}</TableCell>
                        <TableCell className="tabular-nums">{Number(f.gallons).toFixed(2)}</TableCell>
                        <TableCell className="tabular-nums">{f.gross_price ? usd.format(Number(f.gross_price)) : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => deleteFuel.mutate(f.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add trip dialog */}
      <Dialog open={tripOpen} onOpenChange={setTripOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("ifta.tripDialog")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("ifta.tripDate")}</Label>
              <Input type="date" value={tripForm.trip_date} onChange={(e) => setTripForm({ ...tripForm, trip_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("ifta.tripTotalMiles")}</Label>
              <Input type="number" value={tripForm.total_miles} onChange={(e) => setTripForm({ ...tripForm, total_miles: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("ifta.tripJurisLabel")}</Label>
              <Textarea
                rows={2}
                placeholder="TX:250, NM:180, AZ:90"
                value={tripForm.jurisdictions}
                onChange={(e) => setTripForm({ ...tripForm, jurisdictions: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">{t("ifta.tripJurisHint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{t("ifta.tripNotes")}</Label>
              <Input value={tripForm.notes} onChange={(e) => setTripForm({ ...tripForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTripOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddTrip} disabled={!tripForm.trip_date || createTrip.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add fuel dialog */}
      <Dialog open={fuelOpen} onOpenChange={setFuelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("ifta.fuelDialog")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("ifta.tripDate")}</Label>
                <Input type="date" value={fuelForm.purchase_date} onChange={(e) => setFuelForm({ ...fuelForm, purchase_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("ifta.fuelJuris")}</Label>
                <Input maxLength={3} value={fuelForm.jurisdiction} onChange={(e) => setFuelForm({ ...fuelForm, jurisdiction: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("ifta.fuelGallons")}</Label>
                <Input type="number" step="0.001" value={fuelForm.gallons} onChange={(e) => setFuelForm({ ...fuelForm, gallons: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("ifta.fuelGross")}</Label>
                <Input type="number" step="0.01" value={fuelForm.gross_price} onChange={(e) => setFuelForm({ ...fuelForm, gross_price: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("ifta.fuelNotes")}</Label>
              <Input value={fuelForm.notes} onChange={(e) => setFuelForm({ ...fuelForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFuelOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddFuel} disabled={!fuelForm.purchase_date || !fuelForm.gallons || createFuel.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
