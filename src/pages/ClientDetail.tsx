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
import { ArrowLeft, Pencil, Trash2, Loader2, Phone, Mail, MapPin, Plus, Truck as TruckIcon, FileCheck, FileText, Eye, Clock, UserPlus, Sparkles, PenLine, Map, FileDown, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CommentsSection } from "@/components/CommentsSection";
import { InternalNotesSection } from "@/components/InternalNotesSection";
import { AIChatPanel } from "@/components/AIChatPanel";
import { Lock } from "lucide-react";
import { useClientMessages, useRetryMessage } from "@/hooks/useMessages";
import { useInvoices } from "@/hooks/useInvoices";
import { usePermitDocuments } from "@/hooks/usePermitDocuments";
import { Send, RotateCw, MessageCircle, DollarSign } from "lucide-react";

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

  const generateCompliancePdf = () => {
    if (!client || !permits) return;
    const validPermits = permits.filter((p) => {
      if (!p.expiration_date) return false;
      return new Date(p.expiration_date) > new Date();
    });
    const score = permits.length > 0 ? Math.round((validPermits.length / permits.length) * 100) : 0;
    const healthLabel = score >= 80 ? "Saudável" : score >= 50 ? "Atenção" : "Crítico";
    const healthColor = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";

    const rows = permits.map((p) => {
      const exp = p.expiration_date ? new Date(p.expiration_date) : null;
      const diff = exp ? Math.ceil((exp.getTime() - Date.now()) / 86400000) : null;
      const status = !exp ? "Sem data" : diff! < 0 ? "Vencido" : diff! <= 30 ? `${diff}d restantes` : diff! <= 90 ? `${diff}d restantes` : "Válido";
      return `<tr>
        <td>${escapeHtml(p.permit_type)}</td>
        <td>${escapeHtml(p.permit_number || "—")}</td>
        <td>${escapeHtml(p.state || "—")}</td>
        <td>${exp ? format(exp, "dd/MM/yyyy") : "—"}</td>
        <td style="color:${!exp || diff! < 0 ? "#dc2626" : diff! <= 30 ? "#dc2626" : diff! <= 90 ? "#d97706" : "#16a34a"}">${status}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>Compliance Report - ${escapeHtml(client.company_name)}</title>
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
      <h1>Relatório de Compliance</h1>
      <div class="meta">${escapeHtml(client.company_name)} — ${new Date().toLocaleDateString()}</div>
      <div class="info">
        ${client.dot ? `<div><span>DOT:</span> ${escapeHtml(client.dot)}</div>` : ""}
        ${client.mc ? `<div><span>MC:</span> ${escapeHtml(client.mc)}</div>` : ""}
        ${client.ein ? `<div><span>EIN:</span> ${escapeHtml(client.ein)}</div>` : ""}
      </div>
      <div class="score-box"><div class="number">${score}%</div><div class="label">${healthLabel}</div></div>
      <p style="font-size:13px;color:#666">${validPermits.length} de ${permits.length} permits em dia</p>
      <table>
        <thead><tr><th>Tipo</th><th>Número</th><th>Estado</th><th>Validade</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">MartinsAdviser — Compliance Report</div>
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============ HERO HEADER ============ */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />
        <div className="orb w-64 h-64 bg-accent/20 bottom-0 left-1/3" />

        <div className="relative">
          <button
            onClick={() => navigate("/clients")}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/10 border border-white/15 backdrop-blur-md text-white text-xs font-semibold hover:bg-white/15 transition-all mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("common.back")}
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${clientGradient} flex items-center justify-center text-white font-display font-bold text-2xl sm:text-3xl shadow-2xl ring-4 ring-white/10 flex-shrink-0`}
              >
                {clientInitials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={status.className}>{status.label}</Badge>
                  {client.dot && (
                    <span className="inline-flex items-center h-6 px-2 rounded-md text-[11px] font-bold uppercase tracking-wider bg-white/10 border border-white/15 text-white/80">
                      DOT {client.dot}
                    </span>
                  )}
                  {client.mc && (
                    <span className="inline-flex items-center h-6 px-2 rounded-md text-[11px] font-bold uppercase tracking-wider bg-white/10 border border-white/15 text-white/80">
                      MC {client.mc}
                    </span>
                  )}
                </div>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text leading-tight break-words">
                  {client.company_name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-white/70">
                  {client.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {client.phone}
                    </span>
                  )}
                  {client.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {client.email}
                    </span>
                  )}
                  {client.address && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {client.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGenerateReport}
                disabled={aiLoading}
                className="h-10 px-4 rounded-xl bg-white text-[#0b0d2e] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 transition-all shadow-lg disabled:opacity-60"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {t("ai.generateReport")}
              </button>
              <button
                onClick={generateCompliancePdf}
                disabled={!permits?.length}
                className="h-10 px-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/15 transition-all disabled:opacity-40"
              >
                <FileDown className="w-4 h-4" />
                {t("clientDetail.compliancePdf")}
              </button>
              <button
                onClick={() => setInviteOpen(true)}
                className="h-10 px-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/15 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                {t("portal.inviteClient")}
              </button>
              <button
                onClick={() => setEditOpen(true)}
                className="h-10 px-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/15 transition-all"
              >
                <Pencil className="w-4 h-4" />
                {t("common.edit")}
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="h-10 w-10 rounded-xl bg-red-500/20 border border-red-400/30 backdrop-blur-md text-white inline-flex items-center justify-center hover:bg-red-500/30 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("clients.removeClient")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("clients.removeClientDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      {t("common.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Quick metric pills */}
          <div className="relative mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Permits", value: permits?.length ?? 0, icon: FileCheck, tint: "from-emerald-400 to-teal-400" },
              { label: "Trucks", value: trucks?.length ?? 0, icon: TruckIcon, tint: "from-sky-400 to-blue-400" },
              { label: "Compliance", value: `${complianceScore}%`, icon: Sparkles, tint: "from-fuchsia-400 to-pink-400" },
              { label: "Faturado", value: currency(financeSummary.total), icon: DollarSign, tint: "from-amber-400 to-orange-400" },
            ].map((m) => (
              <div
                key={m.label}
                className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-3 sm:p-4"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.tint} flex items-center justify-center shadow-md flex-shrink-0`}
                  >
                    <m.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">
                      {m.label}
                    </div>
                    <div className="font-display text-lg sm:text-xl font-bold text-white truncate">
                      {m.value}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ INFO / SERVICES / FINANCE ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Info */}
        <Card className="lg:col-span-2 border-border/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="font-display text-base">{t("clients.info")}</CardTitle>
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
                  className="rounded-xl bg-muted/40 border border-border/50 p-3"
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
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-md">
                  <FileCheck className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="font-display text-base">
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
                          ? "btn-gradient text-white shadow-md"
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
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="font-display text-base">
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

      <ComplianceDashboard permits={permits} />

      <Card className="border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center shadow-md">
              <Map className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="font-display text-base">{t("map.title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <PermitCoverageMap permits={permits} />
        </CardContent>
      </Card>

      <Tabs defaultValue="trucks">
        <TabsList className="h-auto p-1.5 bg-muted/50 rounded-2xl flex-wrap gap-1">
          <TabsTrigger value="trucks" className="gap-2"><TruckIcon className="w-4 h-4" />{t("trucks.title")} ({trucks?.length || 0})</TabsTrigger>
          <TabsTrigger value="permits" className="gap-2"><FileCheck className="w-4 h-4" />{t("permits.title")} ({permits?.length || 0})</TabsTrigger>
          <TabsTrigger value="signatures" className="gap-2"><PenLine className="w-4 h-4" />{t("signature.tab")} </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2"><Send className="w-4 h-4" />{t("clientDetail.messagesTab")} ({clientMessages?.length || 0})</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Clock className="w-4 h-4" />{t("activity.title")}</TabsTrigger>
            <TabsTrigger value="comments" className="gap-2"><MessageSquare className="w-4 h-4" />{t("clientDetail.commentsTab")}</TabsTrigger>
            <TabsTrigger value="notes" className="gap-2"><Lock className="w-4 h-4" />{t("clientDetail.notesTab")}</TabsTrigger>
            <TabsTrigger value="ai" className="gap-2"><Sparkles className="w-4 h-4" />{t("clientDetail.aiTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="trucks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display text-lg">{t("trucks.title")}</CardTitle>
              <Button size="sm" onClick={handleNewTruck}><Plus className="w-4 h-4 mr-2" />{t("common.add")}</Button>
            </CardHeader>
            <CardContent className="p-0">
              {!trucks?.length ? (
                <div className="p-8 text-center text-muted-foreground">{t("clients.noTrucks")}</div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t("trucks.plate")}</TableHead><TableHead>{t("trucks.makeModel")}</TableHead><TableHead>{t("trucks.year")}</TableHead><TableHead>VIN</TableHead><TableHead>{t("clients.status")}</TableHead><TableHead className="w-24">{t("common.actions")}</TableHead>
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
              <CardTitle className="font-display text-lg">{t("permits.title")}</CardTitle>
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
              <CardTitle className="font-display text-lg">{t("signature.tab")}</CardTitle>
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
              <CardTitle className="font-display text-lg flex items-center gap-2">
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
          <TabsContent value="ai" className="mt-4">
            <AIChatPanel clientId={id!} clientName={client.company_name} />
          </TabsContent>
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
