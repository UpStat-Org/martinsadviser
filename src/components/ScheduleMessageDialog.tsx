import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Send, Wand2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import { useMessageTemplates, useCreateScheduledMessage } from "@/hooks/useMessages";
import { replacePlaceholders } from "@/lib/placeholders";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFeatureFlag } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ScheduleMessageDialog({ open, onOpenChange }: Props) {
  const [clientId, setClientId] = useState("");
  const [channel, setChannel] = useState("email");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("09:00");
  const [sendNow, setSendNow] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const { data: clients } = useClients();
  const { data: templates } = useMessageTemplates();
  const create = useCreateScheduledMessage();
  const selectedClient = clients?.find((c) => c.id === clientId) || null;
  const { t, language } = useLanguage();
  const aiEnabled = useFeatureFlag("ai_chat") || useFeatureFlag("ai_reports");
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setClientId(""); setChannel("email"); setTemplateId(""); setSubject(""); setBody(""); setDate(undefined); setTime("09:00"); setSendNow(false); setAiInstruction("");
    }
  }, [open]);

  const handleGenerateDraft = async () => {
    if (!clientId) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-draft", {
        body: { client_id: clientId, channel, language, instruction: aiInstruction },
      });
      if (error) throw error;
      if (data?.subject !== undefined && channel === "email") setSubject(data.subject || "");
      if (data?.body) setBody(data.body);
    } catch {
      toast({ title: t("messages.aiDraftFailed"), variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleTemplateChange = (tId: string) => {
    setTemplateId(tId);
    if (tId && tId !== "none") {
      const tmpl = templates?.find((t) => t.id === tId);
      if (tmpl) {
        setChannel(tmpl.channel);
        setSubject(tmpl.subject || "");
        setBody(tmpl.body);
      }
    }
  };

  const handleSubmit = async () => {
    if (!clientId || !body) return;
    if (!sendNow && !date) return;

    let scheduledAt: string;
    if (sendNow) {
      scheduledAt = new Date().toISOString();
    } else {
      const [h, m] = time.split(":").map(Number);
      const dt = new Date(date!);
      dt.setHours(h, m, 0, 0);
      scheduledAt = dt.toISOString();
    }

    create.mutate({
      client_id: clientId,
      template_id: templateId && templateId !== "none" ? templateId : null,
      channel,
      subject: subject || null,
      body,
      scheduled_at: scheduledAt,
    }, {
      onSuccess: async () => {
        if (sendNow) {
          try {
            await supabase.functions.invoke("send-emails");
          } catch {
            toast({ title: t("messages.immediateSendFailed"), variant: "destructive" });
          }
        }
        onOpenChange(false);
      }
    });
  };

  const canSubmit = clientId && body && (sendNow || date) && !create.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{sendNow ? t("messages.sendNow") : t("messages.schedule")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Send Now toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{t("messages.sendNow")}</Label>
              <p className="text-xs text-muted-foreground">{t("messages.sendNowDesc")}</p>
            </div>
            <Switch checked={sendNow} onCheckedChange={setSendNow} />
          </div>

          <div className="space-y-2">
            <Label>{t("common.client")}</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder={t("common.client")} /></SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("messages.template")}</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("messages.channel")}</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">{t("channel.email")}</SelectItem>
                <SelectItem value="sms">{t("channel.sms")}</SelectItem>
                <SelectItem value="whatsapp">{t("channel.whatsapp")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {channel === "email" && (
            <div className="space-y-2">
              <Label>{t("messages.subject")}</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          )}

          {aiEnabled && (
            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Label className="flex items-center gap-1.5 text-sm">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
                {t("messages.aiDraftTitle")}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder={t("messages.aiDraftPlaceholder")}
                  disabled={!clientId || aiLoading}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGenerateDraft}
                  disabled={!clientId || aiLoading}
                  className="shrink-0"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  <span className="ml-1.5">{t("messages.aiDraftGenerate")}</span>
                </Button>
              </div>
              {!clientId && <p className="text-xs text-muted-foreground">{t("messages.aiDraftPickClient")}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("messages.message")}</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          </div>

          {body && clientId && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("messages.preview")}</Label>
              <div className="rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                {replacePlaceholders(body, selectedClient)}
              </div>
            </div>
          )}

          {!sendNow && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("messages.scheduleFor")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "dd/MM/yyyy") : "—"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t("common.time")}</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {sendNow ? <><Send className="w-4 h-4 mr-2" />{t("messages.sendNow")}</> : t("messages.schedule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
