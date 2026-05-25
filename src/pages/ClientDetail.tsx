import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { useParams, useNavigate } from "react-router-dom";
import { useClient, useDeleteClient } from "@/hooks/useClients";
import { useTrucks, useDeleteTruck, type Truck } from "@/hooks/useTrucks";
import { usePermits, useDeletePermit, getExpirationStatus, type Permit } from "@/hooks/usePermits";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { TruckFormDialog } from "@/components/TruckFormDialog";
import { PermitFormDialog } from "@/components/PermitFormDialog";
import { ComplianceDashboard } from "@/components/ComplianceDashboard";
import { ComplianceScorecard } from "@/components/ComplianceScorecard";
import { RiskScorePanel } from "@/components/RiskScorePanel";
import { Mcs150Card } from "@/components/Mcs150Card";
import { NewEntrantCard } from "@/components/NewEntrantCard";
import { CsaScoresCard } from "@/components/CsaScoresCard";
import { PspCard } from "@/components/PspCard";
import { InsurancePanel } from "@/components/InsurancePanel";
import { RoadsidePanel } from "@/components/RoadsidePanel";
import { AccidentsPanel } from "@/components/AccidentsPanel";
import { ClientTagsEditor } from "@/components/ClientTagsEditor";
import { ApplyTemplateButton } from "@/components/ApplyTemplateButton";
import { DriversPanel } from "@/components/DriversPanel";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { InvitePortalDialog } from "@/components/InvitePortalDialog";
import { SignatureDialog } from "@/components/SignatureDialog";
import { SignatureViewer } from "@/components/SignatureViewer";
import { PermitCoverageMap } from "@/components/PermitCoverageMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Loader2, Phone, Mail, MapPin, Plus, Truck as TruckIcon, FileCheck, FileText, Eye, Clock, UserPlus, Sparkles, PenLine, Map, FileDown, MessageSquare, Wand2 } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CommentsSection } from "@/components/CommentsSection";
import { InternalNotesSection } from "@/components/InternalNotesSection";
import { AIChatPanel } from "@/components/AIChatPanel";
import { ComplianceAutopilotDialog } from "@/components/ComplianceAutopilotDialog";
import { Lock } from "lucide-react";
import { useClientMessages, useRetryMessage } from "@/hooks/useMessages";
import { useInvoices } from "@/hooks/useInvoices";
import { usePermitDocuments } from "@/hooks/usePermitDocuments";
import { Send, RotateCw, MessageCircle, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

const serviceLabels = [
  { key: "service_ifta", label: "IFTA" },
  { key: "service_ct", label: "CT" },
  { key: "service_ny", label: "NY" },
  { key: "service_kyu", label: "KYU" },
  { key: "service_nm", label: "NM" },
  { key: "service_automatic", label: "Automatic" },
] as const;

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);
  const { data: trucks } = useTrucks(undefined, id);
  const { data: permits } = usePermits(undefined, id);
  const deleteClient = useDeleteClient();
  const deleteTruck = useDeleteTruck();
  const deletePermit = useDeletePermit();
  const { data: clientMessages } = useClientMessages(id);
  const retryMessage = useRetryMessage();
  const { data: clientInvoices } = useInvoices(id);
  const [viewDocPermitId, setViewDocPermitId] = useState<string | null>(null);
  const { data: docVersions } = usePermitDocuments(viewDocPermitId || undefined);

  const financeSummary = useMemo(() => {
    if (!clientInvoices) return { total: 0, paid: 0, pending: 0 };
    const total = clientInvoices.reduce((s, i) => s + Number(i.amount), 0);
    const paid = clientInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
    const pending = clientInvoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + Number(i.amount), 0);
    return { total, paid, pending };
  }, [clientInvoices]);
  const { t, language } = useLanguage();
  const { hasFeature } = useOrg();

  const generateCompliancePdf = () => {
    if (!client || !permits) return;
    const validPermits = permits.filter((p) => {
      if (!p.expiration_date) return false;
      return new Date(p.expiration_date) > new Date();
    });
    const score = permits.length > 0 ? Math.round((validPermits.length / permits.length) * 100) : 0;
    const healthLabel = score >= 80 ? t("compliance.healthy") : score >= 50 ? t("compliance.warning") : t("compliance.critical");
    const healthColor = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";

    const rows = permits.map((p) => {
      const exp = p.expiration_date ? new Date(p.expiration_date) : null;
      const diff = exp ? Math.ceil((exp.getTime() - Date.now()) / 86400000) : null;
      const status = !exp ? t("compliance.noDate") : diff! < 0 ? t("common.expired") : diff! <= 30 ? t("common.daysRemaining").replace("{days}", String(diff)) : diff! <= 90 ? t("common.daysRemaining").replace("{days}", String(diff)) : t("common.valid");
      return `<tr>
        <td>${escapeHtml(p.permit_type)}</td>
        <td>${escapeHtml(p.permit_number || "—")}</td>
        <td>${escapeHtml(p.state || "—")}</td>
        <td>${exp ? format(exp, "dd/MM/yyyy") : "—"}</td>
        <td style="color:${!exp || diff! < 0 ? "#dc2626" : diff! <= 30 ? "#dc2626" : diff! <= 90 ? "#d97706" : "#16a34a"}">${status}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>${escapeHtml(t("compliance.report"))} - ${escapeHtml(client.company_name)}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:40px;color:#1a1a1a}
        h1{font-size:22px;margin-bottom:4px}
        .meta{color:#666;font-size:12px;margin-bottom:24px}
        .score-box{display:inline-block;padding:12px 24px;border-radius:8px;background:${healthColor}15;border:2px solid ${healthColor};margin-bottom:24px}
        .score-box .number{font-size:36px;font-weight:bold;color:${healthColor}}
        .score-box .label{font-size:14px;color:${healthColor}}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}
        th{background:#f4f4f5;padding:8px;text-align:left;border-bottom:2px solid #e4e4e7;font-weight:600}
        td{padding:6px 8px;border-bottom:1px solid #e4e4e7}
        .info{display:flex;gap:24px;margin-bottom:16px;font-size:13px}
        .info span{color:#666}
        .footer{margin-top:24px;font-size:10px;color:#999;text-align:right}
      </style></head><body>
      <h1>${escapeHtml(t("compliance.report"))}</h1>
      <div class="meta">${escapeHtml(client.company_name)} — ${new Date().toLocaleDateString()}</div>
      <div class="info">
        ${client.dot ? `<div><span>DOT:</span> ${escapeHtml(client.dot)}</div>` : ""}
        ${client.mc ? `<div><span>MC:</span> ${escapeHtml(client.mc)}</div>` : ""}
        ${client.ein ? `<div><span>EIN:</span> ${escapeHtml(client.ein)}</div>` : ""}
      </div>
      <div class="score-box"><div class="number">${score}%</div><div class="label">${healthLabel}</div></div>
      <p style="font-size:13px;color:#666">${escapeHtml(t("compliance.upToDateCount").replace("{valid}", String(validPermits.length)).replace("{total}", String(permits.length)))}</p>
      <table>
        <thead><tr><th>${escapeHtml(t("common.type"))}</th><th>${escapeHtml(t("common.number"))}</th><th>${escapeHtml(t("common.state"))}</th><th>${escapeHtml(t("common.expiration"))}</th><th>${escapeHtml(t("clients.status"))}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">MartinsAdviser — ${escapeHtml(t("compliance.reportFooter"))}</div>
    </body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  const { toast } = useToast();
  const { role } = useAuth();
  const isViewer = role === "viewer";

  const [editOpen, setEditOpen] = useState(false);
  const [truckDialogOpen, setTruckDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [permitDialogOpen, setPermitDialogOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
  const [viewDocTitle, setViewDocTitle] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiReportOpen, setAiReportOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const statusMap: Record<string, { label: string; className: string }> = {
    active: { label: t("common.active"), className: "bg-success text-success-foreground" },
    inactive: { label: t("common.inactive"), className: "bg-muted text-muted-foreground" },
    pending: { label: t("common.pending"), className: "bg-warning text-warning-foreground" },
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  if (!client) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">{t("clients.notFound")}</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/clients")}>{t("common.back")}</Button>
    </div>
  );

  const status = statusMap[client.status] || statusMap.active;
  const handleDelete = async () => { await deleteClient.mutateAsync(client.id); navigate("/clients"); };
  const handleEditTruck = (truck: Truck) => { setEditingTruck(truck); setTruckDialogOpen(true); };
  const handleNewTruck = () => { setEditingTruck(null); setTruckDialogOpen(true); };
  const handleEditPermit = (permit: Permit) => { setEditingPermit(permit); setPermitDialogOpen(true); };
  const handleNewPermit = () => { setEditingPermit(null); setPermitDialogOpen(true); };


  const handleGenerateReport = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-report", {
        body: { client_id: id, language },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiReport(data.report);
      setAiReportOpen(true);
    } catch (e: any) {
      console.error("AI Report error:", e);
      toast({ title: t("clientDetail.reportError"), description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const clientInitials = client.company_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  const gradients = [
    "from-indigo-500 to-violet-500",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-amber-500",
    "from-rose-500 to-red-500",
    "from-fuchsia-500 to-pink-500",
    "from-sky-500 to-blue-500",
    "from-purple-500 to-indigo-500",
  ];
  let h = 0;
  for (let i = 0; i < client.id.length; i++) h = (h * 31 + client.id.charCodeAt(i)) >>> 0;
  const clientGradient = gradients[h % gradients.length];

  const activePermits = permits?.filter((p) => {
    if (!p.expiration_date) return false;
    return new Date(p.expiration_date) > new Date();
  }).length ?? 0;
  const complianceScore = permits && permits.length > 0
    ? Math.round((activePermits / permits.length) * 100)
    : 100;

  const currency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const metricPills: Array<{ label: string; value: string | number; icon: typeof FileCheck }> = [
    { label: t("permits.title"), value: permits?.length ?? 0, icon: FileCheck },
    { label: t("trucks.title"), value: trucks?.length ?? 0, icon: TruckIcon },
    { label: t("compliance.title"), value: `${complianceScore}%`, icon: Sparkles },
    { label: t("clientDetail.totalBilled"), value: currency(financeSummary.total), icon: DollarSign },
  ];

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate("/clients")}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("common.back")}
      </button>

      <PageHeader
        title={
          <span className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center font-semibold text-sm shrink-0">
              {clientInitials}
            </span>
            <span className="truncate">{client.company_name}</span>
          </span>
        }
        meta={
          <>
            <Badge className={status.className}>{status.label}</Badge>
            {client.dot && (
              <span className="font-mono text-xs">DOT {client.dot}</span>
            )}
            {client.mc && (
              <span className="font-mono text-xs">MC {client.mc}</span>
            )}
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {client.phone && (
              <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{client.phone}</span>
            )}
            {client.email && (
              <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{client.email}</span>
            )}
            {client.address && (
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{client.address}</span>
            )}
          </span>
        }
        actions={
          <>
            {!isViewer && hasFeature("automations") && (
              <Button variant="outline" size="sm" onClick={() => setAutopilotOpen(true)}>
                <Wand2 className="w-4 h-4 mr-1.5" />
                {t("autopilot.run")}
              </Button>
            )}
            {hasFeature("ai_reports") && (
              <Button variant="outline" size="sm" onClick={handleGenerateReport} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                {t("ai.generateReport")}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={generateCompliancePdf} disabled={!permits?.length}>
              <FileDown className="w-4 h-4 mr-1.5" />
              {t("clientDetail.compliancePdf")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1.5" />
              {t("portal.inviteClient")}
            </Button>
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4 mr-1.5" />
              {t("common.edit")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("clients.removeClient")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("clients.removeClientDesc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{t("common.delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      {/* Quick metrics — flat tiles, no glass */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {metricPills.map((m) => (
          <div key={m.label} className="rounded-md border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{m.label}</span>
              <m.icon className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <div className="text-lg font-semibold tracking-tight tabular mt-1 truncate">{m.value}</div>
          </div>
        ))}
      </div>

      {/* ============ INFO / SERVICES / FINANCE ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Info */}
        <Card className="lg:col-span-2 border-border/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                <FileText className="w-4 h-4 text-secondary-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold">{t("clients.info")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: "EIN", value: client.ein },
                { label: "DOT #", value: client.dot },
                { label: "MC #", value: client.mc },
              ].map((f) => (
                <div
                  key={f.label}
                  className="rounded-md bg-muted/40 border border-border/50 p-3"
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mb-1">
                    {f.label}
                  </p>
                  <p className="font-mono text-sm font-bold">{f.value || "—"}</p>
                </div>
              ))}
            </div>

            {(client.phone || client.email || client.address) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/60 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <span className="text-sm truncate">{client.phone}</span>
                  </a>
                )}
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/60 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <span className="text-sm truncate">{client.email}</span>
                  </a>
                )}
                {client.address && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <span className="text-sm truncate">{client.address}</span>
                  </div>
                )}
              </div>
            )}

            {client.notes && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mb-2">
                  {t("clients.notes")}
                </p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {client.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services + Finance */}
        <div className="space-y-4">
          <Card className="border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                  <FileCheck className="w-4 h-4 text-secondary-foreground" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  {t("clients.services")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {serviceLabels.map((s) => {
                  const active = !!client[s.key];
                  return (
                    <span
                      key={s.key}
                      className={`inline-flex items-center h-7 px-3 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 text-white shadow-md"
                          : "bg-muted/50 text-muted-foreground/60 line-through"
                      }`}
                    >
                      {s.label}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-secondary-foreground" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  {t("clientDetail.finance")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: t("clientDetail.totalBilled"), value: financeSummary.total, color: "text-foreground" },
                { label: t("clientDetail.received"), value: financeSummary.paid, color: "text-emerald-600 dark:text-emerald-400" },
                { label: t("clientDetail.pending"), value: financeSummary.pending, color: "text-amber-600 dark:text-amber-400" },
              ].map((r) => (
                <div
                  key={r.label}
                  className="flex justify-between items-center py-2 border-b border-border/40 last:border-0"
                >
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                  <span className={`font-mono font-bold text-sm ${r.color}`}>
                    {currency(r.value)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ClientTagsEditor client={client} />
      </div>
      <ApplyTemplateButton clientId={client.id} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComplianceScorecard client={client} trucks={trucks} permits={permits} />
        <ComplianceDashboard permits={permits} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RiskScorePanel clientId={client.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Mcs150Card client={client} />
        <NewEntrantCard client={client} />
      </div>

      <PspCard client={client} />

      <InsurancePanel clientId={client.id} />

      <CsaScoresCard clientId={client.id} />

      <RoadsidePanel clientId={client.id} />

      <AccidentsPanel clientId={client.id} />

      <DriversPanel clientId={client.id} />

      <Card className="border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
              <Map className="w-4 h-4 text-secondary-foreground" />
            </div>
            <CardTitle className="text-sm font-semibold">{t("map.title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <PermitCoverageMap permits={permits} />
        </CardContent>
      </Card>

      <Tabs defaultValue="trucks">
        <TabsList className="h-auto p-1.5 bg-muted/50 rounded-md flex-wrap gap-1">
          <TabsTrigger value="trucks" className="gap-2"><TruckIcon className="w-4 h-4" />{t("trucks.title")} ({trucks?.length || 0})</TabsTrigger>
          <TabsTrigger value="permits" className="gap-2"><FileCheck className="w-4 h-4" />{t("permits.title")} ({permits?.length || 0})</TabsTrigger>
          {hasFeature("portal") && (
            <TabsTrigger value="signatures" className="gap-2"><PenLine className="w-4 h-4" />{t("signature.tab")} </TabsTrigger>
          )}
          {hasFeature("messages") && (
            <TabsTrigger value="messages" className="gap-2"><Send className="w-4 h-4" />{t("clientDetail.messagesTab")} ({clientMessages?.length || 0})</TabsTrigger>
          )}
          <TabsTrigger value="activity" className="gap-2"><Clock className="w-4 h-4" />{t("activity.title")}</TabsTrigger>
            <TabsTrigger value="comments" className="gap-2"><MessageSquare className="w-4 h-4" />{t("clientDetail.commentsTab")}</TabsTrigger>
            <TabsTrigger value="notes" className="gap-2"><Lock className="w-4 h-4" />{t("clientDetail.notesTab")}</TabsTrigger>
            {hasFeature("ai_chat") && (
              <TabsTrigger value="ai" className="gap-2"><Sparkles className="w-4 h-4" />{t("clientDetail.aiTab")}</TabsTrigger>
            )}
        </TabsList>

        <TabsContent value="trucks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">{t("trucks.title")}</CardTitle>
              <Button size="sm" onClick={handleNewTruck}><Plus className="w-4 h-4 mr-2" />{t("common.add")}</Button>
            </CardHeader>
            <CardContent className="p-0">
              {!trucks?.length ? (
                <div className="p-8 text-center text-muted-foreground">{t("clients.noTrucks")}</div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t("trucks.plate")}</TableHead><TableHead>{t("trucks.makeModel")}</TableHead><TableHead>{t("trucks.year")}</TableHead><TableHead>{t("trucks.vin")}</TableHead><TableHead>{t("clients.status")}</TableHead><TableHead className="w-24">{t("common.actions")}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {trucks.map((truck) => (
                      <TableRow key={truck.id}>
                        <TableCell className="font-medium">{truck.plate}</TableCell>
                        <TableCell>{[truck.make, truck.model].filter(Boolean).join(" ") || "—"}</TableCell>
                        <TableCell>{truck.year || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{truck.vin || "—"}</TableCell>
                        <TableCell><Badge className={truck.status === "active" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>{truck.status === "active" ? t("common.active") : t("common.inactive")}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditTruck(truck)}><Pencil className="w-4 h-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>{t("trucks.removeTruck")}</AlertDialogTitle><AlertDialogDescription>{t("common.cannotUndo")}</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => deleteTruck.mutate(truck.id)}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permits" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">{t("permits.title")}</CardTitle>
              <Button size="sm" onClick={handleNewPermit}><Plus className="w-4 h-4 mr-2" />{t("common.add")}</Button>
            </CardHeader>
            <CardContent className="p-0">
              {!permits?.length ? (
                <div className="p-8 text-center text-muted-foreground">{t("clients.noPermits")}</div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t("common.type")}</TableHead><TableHead>{t("common.number")}</TableHead><TableHead>{t("common.truck")}</TableHead><TableHead>{t("common.state")}</TableHead><TableHead>{t("common.expiration")}</TableHead><TableHead>{t("clients.status")}</TableHead><TableHead>{t("common.doc")}</TableHead><TableHead className="w-24">{t("common.actions")}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {permits.map((permit) => {
                      const expStatus = getExpirationStatus(permit.expiration_date);
                      return (
                        <TableRow key={permit.id}>
                          <TableCell className="font-medium">{permit.permit_type}</TableCell>
                          <TableCell className="font-mono text-xs">{permit.permit_number || "—"}</TableCell>
                          <TableCell>{(permit as any).trucks?.plate || "—"}</TableCell>
                          <TableCell>{permit.state || "—"}</TableCell>
                          <TableCell>{permit.expiration_date ? format(new Date(permit.expiration_date), "dd/MM/yyyy") : "—"}</TableCell>
                          <TableCell><Badge className={expStatus.color}>{expStatus.label}</Badge></TableCell>
                          <TableCell>
                            {permit.document_url ? (
                              <Button variant="ghost" size="icon" onClick={() => { setViewDocUrl(permit.document_url!); setViewDocTitle(`${permit.permit_type} - ${permit.permit_number || ""}`); setViewDocPermitId(permit.id); }}>
                                <FileText className="w-4 h-4 text-primary" />
                              </Button>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditPermit(permit)}><Pencil className="w-4 h-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>{t("permits.removePermit")}</AlertDialogTitle><AlertDialogDescription>{t("common.cannotUndo")}</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => deletePermit.mutate(permit.id)}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="signatures" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">{t("signature.tab")}</CardTitle>
              <Button size="sm" onClick={() => setSignatureOpen(true)}><Plus className="w-4 h-4 mr-2" />{t("signature.new")}</Button>
            </CardHeader>
            <CardContent>
              <SignatureViewer clientId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Send className="w-5 h-5 text-muted-foreground" /> {t("clientDetail.messagesHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!clientMessages?.length ? (
                <div className="p-8 text-center text-muted-foreground">{t("clientDetail.noMessages")}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("clientDetail.channel")}</TableHead>
                      <TableHead>{t("clientDetail.subject")}</TableHead>
                      <TableHead>{t("clients.status")}</TableHead>
                      <TableHead>{t("clientDetail.scheduled")}</TableHead>
                      <TableHead>{t("clientDetail.sent")}</TableHead>
                      <TableHead className="w-16">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientMessages.map((msg) => {
                      const channelIcon: Record<string, string> = { email: "📧", sms: "📱", whatsapp: "💬" };
                      const statusColors: Record<string, string> = {
                        sent: "bg-success text-success-foreground",
                        pending: "bg-warning text-warning-foreground",
                        failed: "bg-destructive text-destructive-foreground",
                        cancelled: "bg-muted text-muted-foreground",
                      };
                      return (
                        <TableRow key={msg.id}>
                          <TableCell>
                            <span className="text-lg mr-1">{channelIcon[msg.channel] || "📨"}</span>
                            <span className="text-xs uppercase">{msg.channel}</span>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{msg.subject || t("clientDetail.noSubject")}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">{msg.body}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[msg.status] || "bg-muted"}>
                              {msg.status === "sent" ? t("clientDetail.msgSent") : msg.status === "pending" ? t("clientDetail.msgPending") : msg.status === "failed" ? t("clientDetail.msgFailed") : t("clientDetail.msgCancelled")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{format(new Date(msg.scheduled_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="text-sm">{msg.sent_at ? format(new Date(msg.sent_at), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                          <TableCell>
                            {msg.status === "failed" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title={t("clientDetail.resend")}
                                onClick={() => retryMessage.mutate(msg.id)}
                                disabled={retryMessage.isPending}
                              >
                                <RotateCw className="w-4 h-4" />
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
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          {id && <ActivityTimeline clientId={id} />}
        </TabsContent>
          <TabsContent value="comments" className="mt-4">
            <CommentsSection entityType="client" entityId={id!} />
          </TabsContent>
          <TabsContent value="notes" className="mt-4">
            <InternalNotesSection clientId={id!} />
          </TabsContent>
          {hasFeature("ai_chat") && (
            <TabsContent value="ai" className="mt-4">
              <AIChatPanel clientId={id!} clientName={client.company_name} />
            </TabsContent>
          )}
      </Tabs>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
      <TruckFormDialog open={truckDialogOpen} onOpenChange={setTruckDialogOpen} truck={editingTruck} defaultClientId={id} />
      <PermitFormDialog open={permitDialogOpen} onOpenChange={setPermitDialogOpen} permit={editingPermit} defaultClientId={id} />
      {viewDocUrl && (
        <DocumentViewer
          open={!!viewDocUrl}
          onOpenChange={(v) => { if (!v) { setViewDocUrl(null); setViewDocPermitId(null); } }}
          url={viewDocUrl}
          title={viewDocTitle}
          versions={docVersions}
        />
      )}
      <InvitePortalDialog open={inviteOpen} onOpenChange={setInviteOpen} clientId={client.id} clientName={client.company_name} />
      <SignatureDialog open={signatureOpen} onOpenChange={setSignatureOpen} clientId={client.id} />
      <ComplianceAutopilotDialog
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
        client={client}
        permits={permits}
        trucks={trucks}
        invoices={clientInvoices}
        messages={clientMessages}
      />

      {/* AI Report Dialog */}
      <Dialog open={aiReportOpen} onOpenChange={setAiReportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("ai.reportTitle")} — {client.company_name}
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{aiReport || ""}</ReactMarkdown>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
