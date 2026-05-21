import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, Plus, Trash2, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  useInsuranceCertificates,
  useCreateInsurance,
  useDeleteInsurance,
  POLICY_TYPES,
  type PolicyType,
} from "@/hooks/useInsurance";
import { format } from "date-fns";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function expiryBadge(expiration: string | null, label: { soon: string; expired: string; ok: string }) {
  if (!expiration) return null;
  const days = Math.ceil((new Date(expiration).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{label.expired}</Badge>;
  if (days <= 30) return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">{label.soon} {days}d</Badge>;
  return <Badge variant="outline" className="bg-success/10 text-success border-success/30">{label.ok}</Badge>;
}

export function InsurancePanel({ clientId }: { clientId: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: policies } = useInsuranceCertificates(clientId);
  const createMut = useCreateInsurance();
  const deleteMut = useDeleteInsurance();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    policy_type: "liability" as PolicyType,
    policy_number: "",
    insurer_name: "",
    coverage_amount: 0,
    effective_date: "",
    expiration_date: "",
    document_url: "",
    notes: "",
  });

  const save = async () => {
    if (!user) return;
    await createMut.mutateAsync({
      client_id: clientId,
      user_id: user.id,
      policy_type: form.policy_type,
      policy_number: form.policy_number || null,
      insurer_name: form.insurer_name || null,
      coverage_amount: form.coverage_amount || null,
      effective_date: form.effective_date || null,
      expiration_date: form.expiration_date || null,
      document_url: form.document_url || null,
      notes: form.notes || null,
    });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="font-display text-base">{t("insurance.title")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("insurance.subtitle")}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {t("insurance.add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!policies?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t("insurance.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("insurance.col.type")}</TableHead>
                <TableHead>{t("insurance.col.number")}</TableHead>
                <TableHead>{t("insurance.col.insurer")}</TableHead>
                <TableHead className="text-right">{t("insurance.col.coverage")}</TableHead>
                <TableHead>{t("insurance.col.expiration")}</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{t(`insurance.type.${p.policy_type}`)}</TableCell>
                  <TableCell className="font-mono text-xs">{p.policy_number ?? "—"}</TableCell>
                  <TableCell className="text-xs">{p.insurer_name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {p.coverage_amount != null ? usd.format(Number(p.coverage_amount)) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span>{p.expiration_date ? format(new Date(p.expiration_date), "MMM dd, yyyy") : "—"}</span>
                      {expiryBadge(p.expiration_date, {
                        soon: t("mcs150.state.dueSoon"),
                        expired: t("mcs150.state.overdue"),
                        ok: t("mcs150.state.ok"),
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {p.document_url && (
                        <a href={p.document_url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(p.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("insurance.dialogTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("insurance.field.policyType")}</Label>
              <Select value={form.policy_type} onValueChange={(v) => setForm({ ...form, policy_type: v as PolicyType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map((p) => (<SelectItem key={p} value={p}>{t(`insurance.type.${p}`)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("insurance.field.policyNumber")}</Label>
                <Input value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("insurance.field.insurer")}</Label>
                <Input value={form.insurer_name} onChange={(e) => setForm({ ...form, insurer_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("insurance.field.coverage")}</Label>
              <Input type="number" step="1000" value={form.coverage_amount} onChange={(e) => setForm({ ...form, coverage_amount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("insurance.field.effective")}</Label>
                <Input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("insurance.field.expiration")}</Label>
                <Input type="date" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("insurance.field.documentUrl")}</Label>
              <Input placeholder="https://..." value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} />
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
