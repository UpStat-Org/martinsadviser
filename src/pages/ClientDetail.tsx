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
      toast({ title: "Erro ao gerar relatório", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")} className="shrink-0 self-start"><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-foreground">{client.company_name}</h1>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateReport} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {t("ai.generateReport")}
          </Button>
          <Button variant="outline" size="sm" onClick={generateCompliancePdf} disabled={!permits?.length}>
              <FileDown className="w-4 h-4 mr-2" />Compliance PDF
            </Button>
          <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="w-4 h-4 mr-2" />{t("portal.inviteClient")}</Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="w-4 h-4 mr-2" />{t("common.edit")}</Button>
          <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="px-3"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="font-display text-lg">{t("clients.info")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider">EIN</p><p className="font-medium">{client.ein || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider">DOT #</p><p className="font-medium">{client.dot || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider">MC #</p><p className="font-medium">{client.mc || "—"}</p></div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              {client.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /><span>{client.phone}</span></div>}
              {client.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /><span>{client.email}</span></div>}
              {client.address && <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" /><span>{client.address}</span></div>}
            </div>
            {client.notes && <div className="pt-2"><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("clients.notes")}</p><p className="text-sm whitespace-pre-wrap">{client.notes}</p></div>}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">{t("clients.services")}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {serviceLabels.map((s) => <Badge key={s.key} variant={client[s.key] ? "default" : "outline"} className={!client[s.key] ? "opacity-40" : ""}>{s.label}</Badge>)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><DollarSign className="w-5 h-5 text-success" />Financeiro</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Faturado</span>
                <span className="font-mono font-bold">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(financeSummary.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recebido</span>
                <span className="font-mono text-success">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(financeSummary.paid)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pendente</span>
                <span className="font-mono text-warning">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(financeSummary.pending)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ComplianceDashboard permits={permits} />

      <Card>
        <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Map className="w-5 h-5 text-muted-foreground" />{t("map.title")}</CardTitle></CardHeader>
        <CardContent>
          <PermitCoverageMap permits={permits} />
        </CardContent>
      </Card>

      <Tabs defaultValue="trucks">
        <TabsList>
          <TabsTrigger value="trucks" className="gap-2"><TruckIcon className="w-4 h-4" />{t("trucks.title")} ({trucks?.length || 0})</TabsTrigger>
          <TabsTrigger value="permits" className="gap-2"><FileCheck className="w-4 h-4" />{t("permits.title")} ({permits?.length || 0})</TabsTrigger>
          <TabsTrigger value="signatures" className="gap-2"><PenLine className="w-4 h-4" />{t("signature.tab")} </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2"><Send className="w-4 h-4" />Mensagens ({clientMessages?.length || 0})</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Clock className="w-4 h-4" />{t("activity.title")}</TabsTrigger>
            <TabsTrigger value="comments" className="gap-2"><MessageSquare className="w-4 h-4" />Comentários</TabsTrigger>
            <TabsTrigger value="notes" className="gap-2"><Lock className="w-4 h-4" />Notas Internas</TabsTrigger>
            <TabsTrigger value="ai" className="gap-2"><Sparkles className="w-4 h-4" />Assistente IA</TabsTrigger>
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
                <Send className="w-5 h-5 text-muted-foreground" /> Histórico de Mensagens
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!clientMessages?.length ? (
                <div className="p-8 text-center text-muted-foreground">Nenhuma mensagem enviada para este cliente</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Agendado</TableHead>
                      <TableHead>Enviado</TableHead>
                      <TableHead className="w-16">Ações</TableHead>
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
                            <p className="font-medium text-sm">{msg.subject || "(sem assunto)"}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">{msg.body}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[msg.status] || "bg-muted"}>
                              {msg.status === "sent" ? "Enviado" : msg.status === "pending" ? "Pendente" : msg.status === "failed" ? "Falhou" : "Cancelado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{format(new Date(msg.scheduled_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="text-sm">{msg.sent_at ? format(new Date(msg.sent_at), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                          <TableCell>
                            {msg.status === "failed" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Reenviar"
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
