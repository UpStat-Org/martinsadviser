import { useState } from "react";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, XCircle, Mail, Phone, MessageCircle, Eye, Zap, Send, Loader2 } from "lucide-react";
import { useMessageTemplates, useDeleteTemplate, useScheduledMessages, useCancelScheduledMessage } from "@/hooks/useMessages";
import type { MessageTemplate, ScheduledMessage } from "@/hooks/useMessages";
import MessageTemplateDialog from "@/components/MessageTemplateDialog";
import ScheduleMessageDialog from "@/components/ScheduleMessageDialog";
import AutomationRuleDialog from "@/components/AutomationRuleDialog";
import { replacePlaceholders } from "@/lib/placeholders";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAutomationRules, useDeleteAutomationRule, useUpdateAutomationRule } from "@/hooks/useAutomationRules";
import type { AutomationRule } from "@/hooks/useAutomationRules";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const dateLocales = { pt: ptBR, en: enUS, es };

const channelIcon = (ch: string) => {
  if (ch === "whatsapp") return <MessageCircle className="w-4 h-4 text-primary" />;
  if (ch === "sms") return <Phone className="w-4 h-4 text-primary" />;
  return <Mail className="w-4 h-4 text-accent-foreground" />;
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
  const sentAndFailed = sentMsgs?.filter((m) => m.status === "sent" || m.status === "failed") || [];

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: t("common.pending"), variant: "secondary" },
      sent: { label: t("common.sent"), variant: "default" },
      failed: { label: t("common.failed"), variant: "destructive" },
      cancelled: { label: t("common.cancelled"), variant: "outline" },
    };
    const m = map[s] || { label: s, variant: "outline" as const };
    return <Badge variant={m.variant}>{m.label}</Badge>;
  };

  const handleSendNow = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-emails");
      if (error) throw error;
      toast({ title: t("messages.sendComplete"), description: `${data?.sent || 0} email(s), ${data?.failed || 0} ${t("common.failed").toLowerCase()}.` });
    } catch (e: any) {
      toast({ title: t("messages.sendError"), description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t("messages.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("messages.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {(pendingMsgs?.length ?? 0) > 0 && (
            <Button variant="outline" onClick={handleSendNow} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {t("messages.sendPending")}
            </Button>
          )}
          <Button onClick={() => setScheduleOpen(true)}><Plus className="w-4 h-4 mr-2" />{t("messages.new")}</Button>
        </div>
      </div>

      <Tabs defaultValue="scheduled">
        <TabsList>
          <TabsTrigger value="scheduled">{t("messages.scheduled")}{pendingMsgs?.length ? ` (${pendingMsgs.length})` : ""}</TabsTrigger>
          <TabsTrigger value="sent">{t("messages.sentTab")}</TabsTrigger>
          <TabsTrigger value="automations"><Zap className="w-4 h-4 mr-1" />{t("messages.automations")}{rules?.filter(r => r.enabled).length ? ` (${rules.filter(r => r.enabled).length})` : ""}</TabsTrigger>
          <TabsTrigger value="templates">{t("messages.templates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled">
          {loadingP ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">{t("common.loading")}</CardContent></Card>
          ) : !pendingMsgs?.length ? (
            <Card><CardContent className="p-12 text-center">
              <p className="text-muted-foreground">{t("messages.noScheduled")}</p>
              <Button variant="outline" className="mt-4" onClick={() => setScheduleOpen(true)}><Plus className="w-4 h-4 mr-2" />{t("messages.schedule")}</Button>
            </CardContent></Card>
          ) : (
            <Card><Table>
              <TableHeader><TableRow>
                <TableHead>{t("common.client")}</TableHead>
                <TableHead>{t("messages.channel")}</TableHead>
                <TableHead>{t("messages.message")}</TableHead>
                <TableHead>{t("messages.scheduledFor")}</TableHead>
                <TableHead>{t("clients.status")}</TableHead>
                <TableHead className="w-10" />
              </TableRow></TableHeader>
              <TableBody>
                {pendingMsgs.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{(m as any).clients?.company_name || "—"}</TableCell>
                    <TableCell><div className="flex items-center gap-1">{channelIcon(m.channel)} {m.channel}</div></TableCell>
                    <TableCell className="max-w-[200px] truncate">{replacePlaceholders(m.body, m.clients)}</TableCell>
                    <TableCell>{format(new Date(m.scheduled_at), "dd/MM/yyyy HH:mm", { locale })}</TableCell>
                    <TableCell>{statusBadge(m.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setPreviewMsg(m)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => cancelMsg.mutate(m.id)}><XCircle className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></Card>
          )}
        </TabsContent>

        <TabsContent value="sent">
          {loadingS ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">{t("common.loading")}</CardContent></Card>
          ) : !sentAndFailed.length ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">{t("messages.noSent")}</CardContent></Card>
          ) : (
            <Card><Table>
              <TableHeader><TableRow>
                <TableHead>{t("common.client")}</TableHead>
                <TableHead>{t("messages.channel")}</TableHead>
                <TableHead>{t("messages.message")}</TableHead>
                <TableHead>{t("messages.sentAt")}</TableHead>
                <TableHead>{t("clients.status")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sentAndFailed.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{(m as any).clients?.company_name || "—"}</TableCell>
                    <TableCell><div className="flex items-center gap-1">{channelIcon(m.channel)} {m.channel}</div></TableCell>
                    <TableCell className="max-w-[200px] truncate">{replacePlaceholders(m.body, m.clients)}</TableCell>
                    <TableCell>{m.sent_at ? format(new Date(m.sent_at), "dd/MM/yyyy HH:mm", { locale }) : "—"}</TableCell>
                    <TableCell>{statusBadge(m.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></Card>
          )}
        </TabsContent>

        <TabsContent value="automations">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditRule(null); setAutomationOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t("messages.newAutomation")}</Button>
          </div>
          {loadingR ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">{t("common.loading")}</CardContent></Card>
          ) : !rules?.length ? (
            <Card><CardContent className="p-12 text-center">
              <p className="text-muted-foreground">{t("messages.noAutomation")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("messages.automationDesc")}</p>
              <Button variant="outline" className="mt-4" onClick={() => { setEditRule(null); setAutomationOpen(true); }}><Zap className="w-4 h-4 mr-2" />{t("messages.createAutomation")}</Button>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((r) => (
                <Card key={r.id} className={!r.enabled ? "opacity-60" : ""}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium"><Zap className={`w-4 h-4 ${r.enabled ? "text-warning" : "text-muted-foreground"}`} />{r.name}</div>
                      <Switch checked={r.enabled} onCheckedChange={(checked) => toggleRule.mutate({ id: r.id, enabled: checked })} />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">{r.days_before} {t("messages.daysBefore")}</Badge>
                      <Badge variant="outline" className="flex items-center gap-1">{channelIcon(r.channel)} {r.channel}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.body}</p>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => { setEditRule(r); setAutomationOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditTemplate(null); setTemplateOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t("messages.newTemplate")}</Button>
          </div>
          {loadingT ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">{t("common.loading")}</CardContent></Card>
          ) : !templates?.length ? (
            <Card><CardContent className="p-12 text-center"><p className="text-muted-foreground">{t("messages.noTemplates")}</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tmpl) => (
                <Card key={tmpl.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium">{channelIcon(tmpl.channel)}{tmpl.name}</div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditTemplate(tmpl); setTemplateOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTemplate.mutate(tmpl.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                    {tmpl.subject && <p className="text-xs text-muted-foreground">{t("messages.subject")}: {tmpl.subject}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-3">{tmpl.body}</p>
                    <Badge variant="outline" className="text-xs">{tmpl.channel}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <MessageTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} template={editTemplate} />
      <ScheduleMessageDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <AutomationRuleDialog open={automationOpen} onOpenChange={setAutomationOpen} rule={editRule} />

      <Dialog open={!!previewMsg} onOpenChange={() => setPreviewMsg(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{t("messages.preview")}</DialogTitle></DialogHeader>
          {previewMsg && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {channelIcon(previewMsg.channel)}<span className="capitalize">{previewMsg.channel}</span><span>•</span><span>{previewMsg.clients?.company_name || "—"}</span>
              </div>
              {previewMsg.subject && (
                <div><p className="text-xs font-medium text-muted-foreground">{t("messages.subject")}</p><p className="text-sm font-medium">{replacePlaceholders(previewMsg.subject, previewMsg.clients)}</p></div>
              )}
              <div><p className="text-xs font-medium text-muted-foreground">{t("messages.message")}</p><p className="text-sm whitespace-pre-wrap rounded-md border bg-muted/50 p-3">{replacePlaceholders(previewMsg.body, previewMsg.clients)}</p></div>
              <p className="text-xs text-muted-foreground">{t("messages.scheduledFor")}: {format(new Date(previewMsg.scheduled_at), "dd/MM/yyyy HH:mm", { locale })}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
