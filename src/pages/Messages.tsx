import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  Pencil,
  XCircle,
  Mail,
  Phone,
  MessageCircle,
  Eye,
  Zap,
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
} from "lucide-react";
import {
  useMessageTemplates,
  useDeleteTemplate,
  useScheduledMessages,
  useCancelScheduledMessage,
} from "@/hooks/useMessages";
import type { MessageTemplate, ScheduledMessage } from "@/hooks/useMessages";
import MessageTemplateDialog from "@/components/MessageTemplateDialog";
import ScheduleMessageDialog from "@/components/ScheduleMessageDialog";
import AutomationRuleDialog from "@/components/AutomationRuleDialog";
import { replacePlaceholders } from "@/lib/placeholders";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useAutomationRules,
  useDeleteAutomationRule,
  useUpdateAutomationRule,
} from "@/hooks/useAutomationRules";
import type { AutomationRule } from "@/hooks/useAutomationRules";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const dateLocales = { pt: ptBR, en: enUS, es };

const channelConfig = (ch: string) => {
  if (ch === "whatsapp")
    return { icon: MessageCircle, gradient: "from-emerald-500 to-green-500", label: "WhatsApp" };
  if (ch === "sms")
    return { icon: Phone, gradient: "from-sky-500 to-blue-500", label: "SMS" };
  return { icon: Mail, gradient: "from-indigo-500 to-violet-500", label: "Email" };
};

const ChannelBadge = ({ channel }: { channel: string }) => {
  const cfg = channelConfig(channel);
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-[11px] font-semibold bg-muted/60 border border-border/50">
      <span
        className={`w-4 h-4 rounded bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}
      >
        <Icon className="w-2.5 h-2.5 text-white" />
      </span>
      {cfg.label}
    </span>
  );
};

export default function Messages() {
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<MessageTemplate | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [previewMsg, setPreviewMsg] = useState<ScheduledMessage | null>(null);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | null>(null);
  const [sending, setSending] = useState(false);

  const { data: templates, isLoading: loadingT } = useMessageTemplates();
  const deleteTemplate = useDeleteTemplate();
  const { data: pendingMsgs, isLoading: loadingP } = useScheduledMessages("pending");
  const { data: sentMsgs, isLoading: loadingS } = useScheduledMessages();
  const cancelMsg = useCancelScheduledMessage();
  const { data: rules, isLoading: loadingR } = useAutomationRules();
  const deleteRule = useDeleteAutomationRule();
  const toggleRule = useUpdateAutomationRule();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const locale = dateLocales[language] || ptBR;
  const sentAndFailed =
    sentMsgs?.filter((m) => m.status === "sent" || m.status === "failed") || [];

  const stats = useMemo(() => {
    const pending = pendingMsgs?.length ?? 0;
    const sent = sentMsgs?.filter((m) => m.status === "sent").length ?? 0;
    const failed = sentMsgs?.filter((m) => m.status === "failed").length ?? 0;
    const automations = rules?.filter((r) => r.enabled).length ?? 0;
    return { pending, sent, failed, automations };
  }, [pendingMsgs, sentMsgs, rules]);

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: {
        label: t("common.pending"),
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      },
      sent: {
        label: t("common.sent"),
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      },
      failed: {
        label: t("common.failed"),
        className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      },
      cancelled: {
        label: t("common.cancelled"),
        className: "bg-muted text-muted-foreground border-border",
      },
    };
    const m = map[s] || { label: s, className: "" };
    return (
      <span
        className={`inline-flex items-center h-6 px-2 rounded-md text-[11px] font-semibold border ${m.className}`}
      >
        {m.label}
      </span>
    );
  };

  const handleSendNow = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-emails");
      if (error) throw error;
      toast({
        title: t("messages.sendComplete"),
        description: `${data?.sent || 0} ${t("common.sent").toLowerCase()}, ${data?.failed || 0} ${t("common.failed").toLowerCase()}.${data?.errors?.length ? `\n${data.errors.join("\n")}` : ""}`,
      });
    } catch (e: any) {
      toast({ title: t("messages.sendError"), description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl flex-shrink-0">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
                {t("messages.title")}
              </h1>
              <p className="text-white/70 mt-2 text-sm sm:text-base max-w-xl">
                {t("messages.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {stats.pending > 0 && (
              <button
                onClick={handleSendNow}
                disabled={sending}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:shadow-lg transition-all disabled:opacity-60"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {t("messages.sendPending")}
              </button>
            )}
            <button
              onClick={() => setScheduleOpen(true)}
              className="h-10 px-4 rounded-xl bg-white text-[#0b0d2e] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" />
              {t("messages.new")}
            </button>
          </div>
        </div>
      </div>

      {/* ============ QUICK STATS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Pendentes",
            value: stats.pending,
            icon: Clock,
            gradient: "from-amber-500 to-orange-500",
          },
          {
            label: "Enviadas",
            value: stats.sent,
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-teal-500",
          },
          {
            label: "Falharam",
            value: stats.failed,
            icon: AlertTriangle,
            gradient: "from-red-500 to-rose-500",
          },
          {
            label: "Automações ativas",
            value: stats.automations,
            icon: Zap,
            gradient: "from-fuchsia-500 to-pink-500",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div
              className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${s.gradient} opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`}
            />
            <div className="relative flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md`}
              >
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="relative">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {s.label}
              </div>
              <div className="font-display text-3xl font-bold tracking-tight">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ============ TABS ============ */}
      <Tabs defaultValue="scheduled">
        <TabsList className="h-auto p-1.5 bg-muted/50 rounded-2xl flex-wrap gap-1">
          <TabsTrigger value="scheduled" className="rounded-xl gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {t("messages.scheduled")}
            {stats.pending > 0 && (
              <span className="inline-flex items-center h-4 px-1.5 rounded bg-primary/15 text-primary text-[10px] font-bold">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="rounded-xl gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t("messages.sentTab")}
          </TabsTrigger>
          <TabsTrigger value="automations" className="rounded-xl gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            {t("messages.automations")}
            {stats.automations > 0 && (
              <span className="inline-flex items-center h-4 px-1.5 rounded bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 text-[10px] font-bold">
                {stats.automations}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="rounded-xl gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            {t("messages.templates")}
          </TabsTrigger>
        </TabsList>

        {/* Scheduled */}
        <TabsContent value="scheduled" className="mt-4">
          {loadingP ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !pendingMsgs?.length ? (
            <Card className="border-border/50">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
                  <Mail className="w-9 h-9 text-amber-500" />
                </div>
                <p className="font-display text-lg font-semibold mb-1">
                  {t("messages.noScheduled")}
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Agende sua primeira mensagem para clientes.
                </p>
                <button
                  onClick={() => setScheduleOpen(true)}
                  className="h-11 px-6 rounded-xl btn-gradient text-white text-sm font-semibold inline-flex items-center gap-2 hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  {t("messages.schedule")}
                </button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("common.client")}
                    </TableHead>
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("messages.channel")}
                    </TableHead>
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("messages.message")}
                    </TableHead>
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("messages.scheduledFor")}
                    </TableHead>
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("clients.status")}
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMsgs.map((m) => (
                    <TableRow
                      key={m.id}
                      className="group hover:bg-muted/40 transition-colors border-border/50"
                    >
                      <TableCell className="text-sm font-medium">
                        {m.clients?.company_name || "—"}
                      </TableCell>
                      <TableCell>
                        <ChannelBadge channel={m.channel} />
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                        {replacePlaceholders(m.body, m.clients)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(m.scheduled_at), "dd/MM/yyyy HH:mm", { locale })}
                      </TableCell>
                      <TableCell>{statusBadge(m.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            title={t("messages.sendNow")}
                            onClick={async () => {
                              try {
                                await supabase
                                  .from("scheduled_messages")
                                  .update({ scheduled_at: new Date().toISOString() })
                                  .eq("id", m.id);
                                await supabase.functions.invoke("send-emails");
                                toast({ title: t("messages.sendComplete") });
                              } catch (e: any) {
                                toast({
                                  title: t("messages.sendError"),
                                  description: e.message,
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center justify-center transition-colors"
                          >
                            <Send className="w-3.5 h-3.5 text-primary" />
                          </button>
                          <button
                            onClick={() => setPreviewMsg(m)}
                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => cancelMsg.mutate(m.id)}
                            className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Sent */}
        <TabsContent value="sent" className="mt-4">
          {loadingS ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !sentAndFailed.length ? (
            <Card className="border-border/50">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                </div>
                <p className="text-muted-foreground">{t("messages.noSent")}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("common.client")}
                    </TableHead>
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("messages.channel")}
                    </TableHead>
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("messages.message")}
                    </TableHead>
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("messages.sentAt")}
                    </TableHead>
                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("clients.status")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentAndFailed.map((m) => (
                    <TableRow
                      key={m.id}
                      className="hover:bg-muted/40 transition-colors border-border/50"
                    >
                      <TableCell className="text-sm font-medium">
                        {m.clients?.company_name || "—"}
                      </TableCell>
                      <TableCell>
                        <ChannelBadge channel={m.channel} />
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                        {replacePlaceholders(m.body, m.clients)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.sent_at
                          ? format(new Date(m.sent_at), "dd/MM/yyyy HH:mm", { locale })
                          : "—"}
                      </TableCell>
                      <TableCell>{statusBadge(m.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Automations */}
        <TabsContent value="automations" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditRule(null);
                setAutomationOpen(true);
              }}
              className="h-10 px-4 rounded-xl btn-gradient text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all"
            >
              <Zap className="w-4 h-4" />
              {t("messages.newAutomation")}
            </button>
          </div>
          {loadingR ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !rules?.length ? (
            <Card className="border-border/50">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 border border-fuchsia-500/20 flex items-center justify-center mx-auto mb-5">
                  <Zap className="w-9 h-9 text-fuchsia-500" />
                </div>
                <p className="font-display text-lg font-semibold mb-1">
                  {t("messages.noAutomation")}
                </p>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  {t("messages.automationDesc")}
                </p>
                <button
                  onClick={() => {
                    setEditRule(null);
                    setAutomationOpen(true);
                  }}
                  className="h-11 px-6 rounded-xl btn-gradient text-white text-sm font-semibold inline-flex items-center gap-2 hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  {t("messages.createAutomation")}
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((r) => (
                <Card
                  key={r.id}
                  className={`relative overflow-hidden border-border/50 hover:-translate-y-0.5 hover:shadow-lg transition-all ${
                    !r.enabled ? "opacity-60" : ""
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                      r.enabled
                        ? "from-fuchsia-500 via-pink-500 to-rose-500"
                        : "from-muted to-muted"
                    }`}
                  />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 bg-gradient-to-br ${
                            r.enabled
                              ? "from-fuchsia-500 to-pink-500"
                              : "from-slate-400 to-zinc-400"
                          }`}
                        >
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div className="font-display font-bold text-sm truncate">
                          {r.name}
                        </div>
                      </div>
                      <Switch
                        checked={r.enabled}
                        onCheckedChange={(checked) =>
                          toggleRule.mutate({ id: r.id, enabled: checked })
                        }
                      />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="inline-flex items-center h-6 px-2 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/15">
                        {r.days_before} {t("messages.daysBefore")}
                      </span>
                      <ChannelBadge channel={r.channel} />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {r.body}
                    </p>
                    <div className="flex gap-1 justify-end pt-1 border-t border-border/40">
                      <button
                        onClick={() => {
                          setEditRule(r);
                          setAutomationOpen(true);
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteRule.mutate(r.id)}
                        className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditTemplate(null);
                setTemplateOpen(true);
              }}
              className="h-10 px-4 rounded-xl btn-gradient text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all"
            >
              <Plus className="w-4 h-4" />
              {t("messages.newTemplate")}
            </button>
          </div>
          {loadingT ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !templates?.length ? (
            <Card className="border-border/50">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
                  <FileText className="w-9 h-9 text-indigo-500" />
                </div>
                <p className="text-muted-foreground">{t("messages.noTemplates")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tmpl) => {
                const cfg = channelConfig(tmpl.channel);
                const Icon = cfg.icon;
                return (
                  <Card
                    key={tmpl.id}
                    className="relative overflow-hidden border-border/50 hover:-translate-y-0.5 hover:shadow-lg transition-all"
                  >
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${cfg.gradient}`}
                    />
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-md flex-shrink-0`}
                          >
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-display font-bold text-sm truncate">
                              {tmpl.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                              {cfg.label}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-60 group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setEditTemplate(tmpl);
                              setTemplateOpen(true);
                            }}
                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTemplate.mutate(tmpl.id)}
                            className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                      {tmpl.subject && (
                        <div className="rounded-lg bg-muted/40 border border-border/50 px-2.5 py-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t("messages.subject")}
                          </p>
                          <p className="text-xs font-medium truncate">{tmpl.subject}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {tmpl.body}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <MessageTemplateDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        template={editTemplate}
      />
      <ScheduleMessageDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <AutomationRuleDialog
        open={automationOpen}
        onOpenChange={setAutomationOpen}
        rule={editRule}
      />

      {/* Preview dialog */}
      <Dialog open={!!previewMsg} onOpenChange={() => setPreviewMsg(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
                <Eye className="w-4 h-4 text-white" />
              </div>
              {t("messages.preview")}
            </DialogTitle>
          </DialogHeader>
          {previewMsg && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <ChannelBadge channel={previewMsg.channel} />
                <span className="text-sm text-muted-foreground">
                  {previewMsg.clients?.company_name || "—"}
                </span>
              </div>
              {previewMsg.subject && (
                <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {t("messages.subject")}
                  </p>
                  <p className="text-sm font-semibold">
                    {replacePlaceholders(previewMsg.subject, previewMsg.clients)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t("messages.message")}
                </p>
                <p className="text-sm whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/30 p-4 leading-relaxed">
                  {replacePlaceholders(previewMsg.body, previewMsg.clients)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {t("messages.scheduledFor")}:{" "}
                <span className="font-semibold text-foreground">
                  {format(new Date(previewMsg.scheduled_at), "dd/MM/yyyy HH:mm", { locale })}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
