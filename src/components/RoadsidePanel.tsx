import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  useRoadsideInspections,
  useCreateRoadside,
  useDeleteRoadside,
  type InspectionResult,
} from "@/hooks/useRoadside";
import { format } from "date-fns";

const RESULT_BADGE: Record<InspectionResult, string> = {
  clean: "bg-success/10 text-success border-success/30",
  violations: "bg-warning/10 text-warning border-warning/30",
  oos: "bg-destructive/10 text-destructive border-destructive/30",
};

interface Props {
  clientId: string;
  truckId?: string;
  driverId?: string;
}

export function RoadsidePanel({ clientId, truckId, driverId }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: inspections } = useRoadsideInspections({ clientId, truckId, driverId });
  const createMut = useCreateRoadside();
  const deleteMut = useDeleteRoadside();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    inspection_date: new Date().toISOString().slice(0, 10),
    location: "",
    state: "",
    inspector_id: "",
    inspection_level: 1,
    result: "clean" as InspectionResult,
    csa_points: 0,
    report_number: "",
    notes: "",
  });

  const save = async () => {
    if (!user) return;
    await createMut.mutateAsync({
      client_id: clientId,
      truck_id: truckId ?? null,
      driver_id: driverId ?? null,
      user_id: user.id,
      inspection_date: form.inspection_date,
      location: form.location || null,
      state: form.state || null,
      inspector_id: form.inspector_id || null,
      inspection_level: form.inspection_level,
      result: form.result,
      csa_points: form.csa_points,
      violations: [],
      report_number: form.report_number || null,
      document_url: null,
      notes: form.notes || null,
    });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
              <Search className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="font-display text-base">{t("roadside.title")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("roadside.subtitle")}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {t("roadside.add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!inspections?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t("roadside.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("roadside.col.date")}</TableHead>
                <TableHead>{t("roadside.col.level")}</TableHead>
                <TableHead>{t("roadside.col.result")}</TableHead>
                <TableHead>{t("roadside.col.location")}</TableHead>
                <TableHead className="text-right">{t("roadside.col.points")}</TableHead>
                <TableHead>{t("roadside.col.report")}</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-xs">{format(new Date(i.inspection_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="font-mono text-xs">L{i.inspection_level ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={RESULT_BADGE[i.result]}>{t(`roadside.result.${i.result}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{[i.location, i.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{i.csa_points}</TableCell>
                  <TableCell className="font-mono text-xs">{i.report_number ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(i.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("roadside.dialogTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("roadside.field.date")}</Label>
                <Input type="date" value={form.inspection_date} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("roadside.field.level")}</Label>
                <Select value={String(form.inspection_level)} onValueChange={(v) => setForm({ ...form, inspection_level: parseInt(v, 10) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((n) => (<SelectItem key={n} value={String(n)}>Level {n}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("roadside.field.location")}</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("roadside.field.state")}</Label>
                <Input maxLength={3} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t("roadside.field.inspectorId")}</Label>
                <Input value={form.inspector_id} onChange={(e) => setForm({ ...form, inspector_id: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("roadside.field.result")}</Label>
                <Select value={form.result} onValueChange={(v) => setForm({ ...form, result: v as InspectionResult })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clean">{t("roadside.result.clean")}</SelectItem>
                    <SelectItem value="violations">{t("roadside.result.violations")}</SelectItem>
                    <SelectItem value="oos">{t("roadside.result.oos")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("roadside.field.csaPoints")}</Label>
                <Input type="number" value={form.csa_points} onChange={(e) => setForm({ ...form, csa_points: parseInt(e.target.value, 10) || 0 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("roadside.field.reportNumber")}</Label>
              <Input value={form.report_number} onChange={(e) => setForm({ ...form, report_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("drugTest.notes")}</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={createMut.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
