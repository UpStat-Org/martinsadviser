import { useMemo, useState } from "react";
import {
  ShieldCheck, Plus, AlertTriangle, Clock, FileWarning, Trash2, Loader2, IdCard, Truck, Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegion } from "@/hooks/useRegion";
import { useClients } from "@/hooks/useClients";
import { useTrucks } from "@/hooks/useTrucks";
import { useDrivers } from "@/hooks/useDrivers";
import {
  useBrComplianceItems, useUpsertBrComplianceItem, useDeleteBrComplianceItem,
  type BrComplianceItem,
} from "@/hooks/useBrCompliance";
import {
  kindsForScope, kindSpec, suggestedExpiry,
  type BrComplianceKind, type BrScope,
} from "@/lib/brCompliance";
import { expiryStatus, type ExpiryState } from "@/lib/expiry";

const SCOPES: Array<{ scope: BrScope; icon: typeof IdCard; labelKey: string }> = [
  { scope: "driver", icon: IdCard, labelKey: "nav.drivers" },
  { scope: "truck", icon: Truck, labelKey: "nav.trucks" },
  { scope: "client", icon: Building2, labelKey: "common.client" },
];

const STATE_TONE: Record<ExpiryState, StatusTone> = {
  missing: "neutral",
  expired: "danger",
  expiring: "warning",
  valid: "success",
};

const EMPTY = {
  scope: "driver" as BrScope,
  kind: "cnh" as BrComplianceKind,
  owner_id: "",
  document_number: "",
  issued_on: "",
  expires_on: "",
  notes: "",
};

export default function BrCompliancePage() {
  const { t } = useLanguage();
  const { dateNumeric } = useRegion();

  const { data: items, isLoading } = useBrComplianceItems();
  const { data: drivers } = useDrivers();
  const { data: trucks } = useTrucks();
  const { data: clients } = useClients();

  const upsert = useUpsertBrComplianceItem();
  const remove = useDeleteBrComplianceItem();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BrComplianceItem | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [scopeFilter, setScopeFilter] = useState<BrScope | "all">("all");

  const all = useMemo(() => items ?? [], [items]);

  const withState = useMemo(
    () => all.map((item) => ({ item, expiry: expiryStatus(item.expires_on) })),
    [all],
  );

  const stats = useMemo(() => {
    const count = (state: ExpiryState) => withState.filter((r) => r.expiry.state === state).length;
    return {
      expired: count("expired"),
      expiring: count("expiring"),
      missing: count("missing"),
      total: withState.length,
    };
  }, [withState]);

  const rows = useMemo(
    () => scopeFilter === "all" ? withState : withState.filter((r) => r.item.scope === scopeFilter),
    [withState, scopeFilter],
  );

  const ownersFor = (scope: BrScope) => {
    if (scope === "driver") return (drivers ?? []).map((d) => ({ id: d.id, label: d.full_name }));
    if (scope === "truck") return (trucks ?? []).map((tr) => ({ id: tr.id, label: tr.plate }));
    return (clients ?? []).map((c) => ({ id: c.id, label: c.company_name }));
  };

  const ownerLabel = (item: BrComplianceItem) =>
    item.drivers?.full_name ?? item.trucks?.plate ?? item.clients?.company_name ?? "—";

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (item: BrComplianceItem) => {
    setEditing(item);
    setForm({
      scope: item.scope,
      kind: item.kind,
      owner_id: item.driver_id ?? item.truck_id ?? item.client_id ?? "",
      document_number: item.document_number ?? "",
      issued_on: item.issued_on ?? "",
      expires_on: item.expires_on ?? "",
      notes: item.notes ?? "",
    });
    setOpen(true);
  };

  // Trocar o titular reseta o tipo: um CRLV não existe para motorista, e deixar
  // o valor anterior selecionado produziria uma combinação que a constraint do
  // banco rejeita só na hora de salvar.
  const changeScope = (scope: BrScope) => {
    const first = kindsForScope(scope)[0]?.kind ?? "outro";
    setForm((f) => ({ ...f, scope, kind: first, owner_id: "" }));
  };

  // Preenche a validade a partir da emissão quando o tipo tem prazo típico e o
  // campo ainda está vazio. Nunca sobrescreve o que o usuário digitou: o que
  // vale é o documento na mão dele, não a nossa tabela de prazos.
  const changeIssued = (issued_on: string) => {
    setForm((f) => {
      const suggestion = suggestedExpiry(f.kind, issued_on);
      return {
        ...f,
        issued_on,
        expires_on: f.expires_on || suggestion || "",
      };
    });
  };

  const submit = async () => {
    if (!form.owner_id) return;
    await upsert.mutateAsync({
      id: editing?.id,
      scope: form.scope,
      kind: form.kind,
      driver_id: form.scope === "driver" ? form.owner_id : null,
      truck_id: form.scope === "truck" ? form.owner_id : null,
      client_id: form.scope === "client" ? form.owner_id : null,
      document_number: form.document_number || null,
      issued_on: form.issued_on || null,
      expires_on: form.expires_on || null,
      notes: form.notes || null,
    });
    setOpen(false);
  };

  const kindLabel = (kind: BrComplianceKind) => {
    const spec = kindSpec(kind);
    return spec ? t(spec.labelKey) : kind;
  };

  const suggestion = suggestedExpiry(form.kind, form.issued_on);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("sidebar.section.operation")}
        title={t("br.compliance.title")}
        description={t("br.compliance.subtitle")}
        actions={
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> {t("br.item.new")}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("br.kpi.expired")} value={stats.expired} icon={AlertTriangle}
          tone={stats.expired > 0 ? "danger" : "neutral"} loading={isLoading}
        />
        <KpiCard
          label={t("br.kpi.expiring")} value={stats.expiring} icon={Clock}
          tone={stats.expiring > 0 ? "warning" : "neutral"} loading={isLoading}
        />
        <KpiCard
          label={t("br.kpi.noDate")} value={stats.missing} icon={FileWarning}
          loading={isLoading} hint={t("br.kpi.noDateHint")}
        />
        <KpiCard label={t("br.kpi.total")} value={stats.total} icon={ShieldCheck} loading={isLoading} />
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-md" />
      ) : all.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-8 h-8" />}
          title={t("br.compliance.empty.title")}
          description={t("br.compliance.empty.desc")}
          action={
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" /> {t("br.item.new")}
            </Button>
          }
        />
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/60">
              <Button
                size="sm"
                variant={scopeFilter === "all" ? "secondary" : "ghost"}
                className="h-7 text-xs"
                onClick={() => setScopeFilter("all")}
              >
                {t("common.all")}
              </Button>
              {SCOPES.map(({ scope, icon: Icon, labelKey }) => (
                <Button
                  key={scope}
                  size="sm"
                  variant={scopeFilter === scope ? "secondary" : "ghost"}
                  className="h-7 text-xs gap-1.5"
                  onClick={() => setScopeFilter(scope)}
                >
                  <Icon className="w-3 h-3" /> {t(labelKey)}
                </Button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("br.col.kind")}</TableHead>
                    <TableHead>{t("br.col.owner")}</TableHead>
                    <TableHead>{t("br.col.number")}</TableHead>
                    <TableHead>{t("br.col.issued")}</TableHead>
                    <TableHead>{t("br.col.expires")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ item, expiry }) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => openEdit(item)}
                    >
                      <TableCell className="font-medium">{kindLabel(item.kind)}</TableCell>
                      <TableCell>{ownerLabel(item)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.document_number || "—"}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {item.issued_on ? dateNumeric(new Date(item.issued_on)) : "—"}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {item.expires_on ? dateNumeric(new Date(item.expires_on)) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={STATE_TONE[expiry.state]} size="sm">
                          {expiry.state === "expired" && expiry.daysUntil !== null
                            ? t("br.state.expiredDays").replace("{days}", String(Math.abs(expiry.daysUntil)))
                            : expiry.state === "expiring" && expiry.daysUntil !== null
                              ? t("br.state.expiringDays").replace("{days}", String(expiry.daysUntil))
                              : t(`br.state.${expiry.state}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          aria-label={t("common.delete")}
                          onClick={(e) => { e.stopPropagation(); remove.mutate(item.id); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("br.item.edit") : t("br.item.new")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="br-scope">{t("br.col.ownerType")}</Label>
              <Select
                value={form.scope}
                onValueChange={(v) => changeScope(v as BrScope)}
                disabled={!!editing}
              >
                <SelectTrigger id="br-scope"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPES.map(({ scope, labelKey }) => (
                    <SelectItem key={scope} value={scope}>{t(labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="br-owner">{t("br.col.owner")} *</Label>
              <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                <SelectTrigger id="br-owner"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {ownersFor(form.scope).map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="br-kind">{t("br.col.kind")}</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm({ ...form, kind: v as BrComplianceKind })}
              >
                <SelectTrigger id="br-kind"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {kindsForScope(form.scope).map((spec) => (
                    <SelectItem key={spec.kind} value={spec.kind}>{t(spec.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {kindSpec(form.kind)?.hasNumber && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="br-number">{t("br.col.number")}</Label>
                <Input
                  id="br-number" value={form.document_number}
                  onChange={(e) => setForm({ ...form, document_number: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="br-issued">{t("br.col.issued")}</Label>
              <Input
                id="br-issued" type="date" value={form.issued_on}
                onChange={(e) => changeIssued(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="br-expires">{t("br.col.expires")}</Label>
              <Input
                id="br-expires" type="date" value={form.expires_on}
                onChange={(e) => setForm({ ...form, expires_on: e.target.value })}
              />
              {suggestion && form.expires_on !== suggestion && (
                <button
                  type="button"
                  className="text-[11px] text-primary hover:underline"
                  onClick={() => setForm({ ...form, expires_on: suggestion })}
                >
                  {t("br.item.useSuggested").replace("{date}", dateNumeric(new Date(suggestion)))}
                </button>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="br-notes">{t("common.notes")}</Label>
              <Textarea
                id="br-notes" rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={!form.owner_id || upsert.isPending} className="gap-2">
              {upsert.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
