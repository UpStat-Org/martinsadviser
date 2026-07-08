import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useLeads,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useConvertLead,
  PIPELINE_STAGES,
  LEAD_STAGES,
  type Lead,
  type LeadStage,
} from "@/hooks/useLeads";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Target,
  UserPlus,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  Check,
  X,
  Loader2,
  MoreHorizontal,
  DollarSign,
} from "lucide-react";

const STAGE_TONES: Record<LeadStage, StatusTone> = {
  new: "neutral",
  contacted: "info",
  qualified: "warning",
  proposal: "info",
  won: "success",
  lost: "danger",
};

const emptyForm = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  dot: "",
  mc: "",
  source: "",
  estimated_value: "",
  stage: "new" as LeadStage,
  notes: "",
};

export default function LeadsPage() {
  const { t } = useLanguage();
  const { role } = useAuth();
  const navigate = useNavigate();
  const isViewer = role === "viewer";

  const { data: leads, isLoading } = useLeads();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const convertLead = useConvertLead();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Lost-reason capture dialog
  const [lostLead, setLostLead] = useState<Lead | null>(null);
  const [lostReason, setLostReason] = useState("");

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const stageLabel = (s: LeadStage) => t("leads.stage." + s);

  const openNew = (stage: LeadStage = "new") => {
    setEditing(null);
    setForm({ ...emptyForm, stage });
    setDialogOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setForm({
      company_name: lead.company_name,
      contact_name: lead.contact_name ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      dot: lead.dot ?? "",
      mc: lead.mc ?? "",
      source: lead.source ?? "",
      estimated_value: lead.estimated_value != null ? String(lead.estimated_value) : "",
      stage: lead.stage,
      notes: lead.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.company_name.trim()) return;
    const payload = {
      company_name: form.company_name.trim(),
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      dot: form.dot || null,
      mc: form.mc || null,
      source: form.source || null,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      stage: form.stage,
      notes: form.notes || null,
    };
    if (editing) {
      updateLead.mutate(
        { id: editing.id, ...payload },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createLead.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const moveStage = (lead: Lead, stage: LeadStage) => {
    if (lead.stage === stage) return;
    updateLead.mutate({ id: lead.id, stage, silent: true });
  };

  const markWon = (lead: Lead) => updateLead.mutate({ id: lead.id, stage: "won", silent: true });

  const openLost = (lead: Lead) => {
    setLostLead(lead);
    setLostReason(lead.lost_reason ?? "");
  };

  const confirmLost = () => {
    if (!lostLead) return;
    updateLead.mutate(
      { id: lostLead.id, stage: "lost", lost_reason: lostReason || null, silent: true },
      { onSuccess: () => setLostLead(null) }
    );
  };

  const all = leads ?? [];
  const pipelineLeads = useMemo(
    () => all.filter((l) => PIPELINE_STAGES.includes(l.stage)),
    [all]
  );
  const wonLeads = useMemo(() => all.filter((l) => l.stage === "won"), [all]);
  const lostLeads = useMemo(() => all.filter((l) => l.stage === "lost"), [all]);

  const pipelineValue = useMemo(
    () => pipelineLeads.reduce((s, l) => s + (l.estimated_value ?? 0), 0),
    [pipelineLeads]
  );

  const summary = [
    { label: t("leads.pipelineValue"), value: fmt(pipelineValue), icon: DollarSign },
    { label: t("leads.active"), value: pipelineLeads.length, icon: Target },
    { label: t("leads.won"), value: wonLeads.length, icon: Check },
    { label: t("leads.lost"), value: lostLeads.length, icon: X },
  ];

  const isSaving = createLead.isPending || updateLead.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-md bg-card border border-border flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {t("leads.title")}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl">
                {t("leads.subtitle")}
              </p>
            </div>
          </div>

          {!isViewer && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => openNew()}>
                <UserPlus className="w-4 h-4 mr-1.5" />
                {t("leads.new")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ============ SUMMARY CARDS ============ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {summary.map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-md bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div className="relative flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                <s.icon className="w-4 h-4 text-foreground" />
              </div>
            </div>
            <div className="relative">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {s.label}
              </div>
              <div className="text-2xl lg:text-3xl font-bold tracking-tight truncate">
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ============ EMPTY / BOARD ============ */}
      {all.length === 0 ? (
        <EmptyState
          icon={<Target className="w-9 h-9 text-muted-foreground" />}
          title={t("leads.empty")}
          description={t("leads.emptyDesc")}
          action={
            !isViewer ? (
              <button
                onClick={() => openNew()}
                className="h-11 px-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("leads.new")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* ============ KANBAN BOARD ============ */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {PIPELINE_STAGES.map((stage) => {
              const colLeads = pipelineLeads.filter((l) => l.stage === stage);
              return (
                <div key={stage} className="space-y-3 min-w-0">
                  {/* Column header */}
                  <div className="rounded-md bg-card border border-border/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusBadge tone={STAGE_TONES[stage]}>{stageLabel(stage)}</StatusBadge>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {colLeads.length}
                        </span>
                      </div>
                      {!isViewer && (
                        <button
                          onClick={() => openNew(stage)}
                          className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Column body */}
                  <div className="rounded-md p-2 min-h-[160px] space-y-2 bg-muted/30 border border-transparent">
                    {colLeads.length === 0 && (
                      <div className="flex items-center justify-center py-8 text-[11px] text-muted-foreground/70">
                        {t("leads.emptyColumn")}
                      </div>
                    )}
                    {colLeads.map((lead) => (
                      <Card
                        key={lead.id}
                        className="relative overflow-hidden transition-all hover:shadow-lg border-border/60"
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="font-semibold text-sm leading-snug line-clamp-2 min-w-0">
                              {lead.company_name}
                            </span>
                            {!isViewer && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="w-7 h-7 shrink-0 rounded-md hover:bg-muted flex items-center justify-center transition-colors">
                                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>{t("leads.moveTo")}</DropdownMenuLabel>
                                  {PIPELINE_STAGES.filter((s) => s !== lead.stage).map((s) => (
                                    <DropdownMenuItem key={s} onClick={() => moveStage(lead, s)}>
                                      <ArrowRight className="w-3.5 h-3.5 mr-2" />
                                      {stageLabel(s)}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => markWon(lead)}>
                                    <Check className="w-3.5 h-3.5 mr-2 text-success" />
                                    {t("leads.markWon")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openLost(lead)}>
                                    <X className="w-3.5 h-3.5 mr-2 text-destructive" />
                                    {t("leads.markLost")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openEdit(lead)}>
                                    <Pencil className="w-3.5 h-3.5 mr-2" />
                                    {t("common.edit")}
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                                        {t("common.delete")}
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>{t("common.delete")}?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {t("common.cannotUndo")}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteLead.mutate(lead.id)}>
                                          {t("common.delete")}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          {(lead.contact_name || lead.email) && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {lead.contact_name || lead.email}
                            </p>
                          )}

                          {(lead.estimated_value != null || lead.dot || lead.mc) && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {lead.estimated_value != null && (
                                <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                  <DollarSign className="w-2.5 h-2.5" />
                                  {fmt(lead.estimated_value)}
                                </span>
                              )}
                              {lead.dot && (
                                <span className="inline-flex items-center h-5 px-2 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground">
                                  DOT {lead.dot}
                                </span>
                              )}
                              {lead.mc && (
                                <span className="inline-flex items-center h-5 px-2 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground">
                                  MC {lead.mc}
                                </span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ============ WON / LOST ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Won */}
            <Card className="border-border/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-success" />
              <CardContent className="p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-md bg-success/10 border border-success/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base">{t("leads.won")}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{wonLeads.length}</p>
                  </div>
                </div>
                {wonLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {t("leads.noWon")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {wonLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-card p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{lead.company_name}</p>
                          {lead.estimated_value != null && (
                            <p className="text-[11px] text-muted-foreground">
                              {fmt(lead.estimated_value)}
                            </p>
                          )}
                        </div>
                        {lead.converted_client_id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/clients/${lead.converted_client_id}`)}
                          >
                            {t("leads.viewClient")}
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </Button>
                        ) : !isViewer ? (
                          <Button
                            size="sm"
                            onClick={() => convertLead.mutate(lead)}
                            disabled={convertLead.isPending}
                          >
                            {convertLead.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              t("leads.convert")
                            )}
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lost */}
            <Card className="border-border/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-destructive" />
              <CardContent className="p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                    <X className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base">{t("leads.lost")}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{lostLeads.length}</p>
                  </div>
                </div>
                {lostLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {t("leads.noLost")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lostLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-card p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{lead.company_name}</p>
                          {lead.lost_reason && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {lead.lost_reason}
                            </p>
                          )}
                        </div>
                        {!isViewer && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveStage(lead, "new")}
                          >
                            {t("leads.reopen")}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ============ CREATE / EDIT DIALOG ============ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                {editing ? (
                  <Pencil className="w-4 h-4 text-secondary-foreground" />
                ) : (
                  <Plus className="w-4 h-4 text-secondary-foreground" />
                )}
              </div>
              {editing ? t("leads.edit") : t("leads.new")}
            </DialogTitle>
            <DialogDescription>{t("leads.subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("leads.company")} *
              </Label>
              <Input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="h-11 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leads.contact")}
                </Label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leads.source")}
                </Label>
                <Input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.email")}
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.phone")}
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  DOT
                </Label>
                <Input
                  value={form.dot}
                  onChange={(e) => setForm({ ...form, dot: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  MC
                </Label>
                <Input
                  value={form.mc}
                  onChange={(e) => setForm({ ...form, mc: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leads.estimatedValue")}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.estimated_value}
                  onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
                  className="h-11 rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("clients.status")}
                </Label>
                <Select
                  value={form.stage}
                  onValueChange={(v) => setForm({ ...form, stage: v as LeadStage })}
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {stageLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("clients.notes")}
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="rounded-md"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={!form.company_name.trim() || isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ MARK LOST DIALOG ============ */}
      <Dialog open={!!lostLead} onOpenChange={(v) => !v && setLostLead(null)}>
        <DialogContent className="max-w-md rounded-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <X className="w-4 h-4 text-destructive" />
              </div>
              {t("leads.markLost")}
            </DialogTitle>
            <DialogDescription>{lostLead?.company_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("leads.lostReason")}
            </Label>
            <Textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              rows={3}
              className="rounded-md"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostLead(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmLost} disabled={updateLead.isPending}>
              {updateLead.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("leads.markLost")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
