import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Send, Wand2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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

// Compact two-column form so the dialog stays in viewport on a 13" laptop
// without scrolling. Body and preview are full-width; everything else
// pairs up. The dialog itself caps at 85vh and overflows internally.
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
  const [showPreview, setShowPreview] = useState(false);

  const { data: clients } = useClients();
  const { data: templates } = useMessageTemplates();
  const create = useCreateScheduledMessage();
  const selectedClient = clients?.find((c) => c.id === clientId) || null;
  const { t, language } = useLanguage();
  const aiChatEnabled = useFeatureFlag("ai_chat");
  const aiReportsEnabled = useFeatureFlag("ai_reports");
  const aiEnabled = aiChatEnabled || aiReportsEnabled;
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setClientId("");
      setChannel("email");
      setTemplateId("");
      setSubject("");
      setBody("");
      setDate(undefined);
      setTime("09:00");
      setSendNow(false);
      setAiInstruction("");
      setShowPreview(false);
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

    create.mutate(
      {
        client_id: clientId,
        template_id: templateId && templateId !== "none" ? templateId : null,
        channel,
        subject: subject || null,
        body,
        scheduled_at: scheduledAt,
      },
      {
        onSuccess: async () => {
          if (sendNow) {
            try {
              await supabase.functions.invoke("send-emails");
            } catch {
              toast({ title: t("messages.immediateSendFailed"), variant: "destructive" });
            }
          }
          onOpenChange(false);
        },
      },
    );
  };

  const canSubmit = clientId && body && (sendNow || date) && !create.isPending;
  const previewText = body && clientId ? replacePlaceholders(body, selectedClient) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[88vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border space-y-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">
                {sendNow ? t("messages.sendNow") : t("messages.schedule")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t("messages.sendNowDesc")}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Label htmlFor="send-now" className="text-xs text-muted-foreground">
                {t("messages.sendNow")}
              </Label>
              <Switch id="send-now" checked={sendNow} onCheckedChange={setSendNow} />
            </div>
          </div>
        </DialogHeader>

        {/* Body — scrolls internally if needed */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Row 1: client + template */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("common.client")} required>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("common.client")} />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t("messages.template")}>
              <Select value={templateId} onValueChange={handleTemplateChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {templates?.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Row 2: channel + (date + time | subject) */}
          <div
            className={cn(
              "grid grid-cols-1 gap-3",
              sendNow ? "sm:grid-cols-2" : "sm:grid-cols-[1fr_1fr_120px]",
            )}
          >
            <Field label={t("messages.channel")}>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">{t("channel.email")}</SelectItem>
                  <SelectItem value="sms">{t("channel.sms")}</SelectItem>
                  <SelectItem value="whatsapp">{t("channel.whatsapp")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {!sendNow && (
              <>
                <Field label={t("messages.scheduleFor")} required>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-9 w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {date ? format(date, "dd/MM/yyyy") : "—"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </Field>

                <Field label={t("common.time")}>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-9"
                  />
                </Field>
              </>
            )}

            {sendNow && channel === "email" && (
              <Field label={t("messages.subject")}>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9" />
              </Field>
            )}
          </div>

          {/* Subject — separate row when scheduling, since the row above is full */}
          {!sendNow && channel === "email" && (
            <Field label={t("messages.subject")}>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9" />
            </Field>
          )}

          {/* AI draft — single dense row */}
          {aiEnabled && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Wand2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <Input
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder={t("messages.aiDraftPlaceholder")}
                  disabled={!clientId || aiLoading}
                  className="h-8 border-0 bg-card focus-visible:ring-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDraft}
                  disabled={!clientId || aiLoading}
                  className="shrink-0 h-8"
                >
                  {aiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    t("messages.aiDraftGenerate")
                  )}
                </Button>
              </div>
              {!clientId && (
                <p className="text-[11px] text-muted-foreground mt-1.5 ml-5">
                  {t("messages.aiDraftPickClient")}
                </p>
              )}
            </div>
          )}

          {/* Message body */}
          <Field
            label={t("messages.message")}
            required
            trailing={
              previewText && (
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="text-[11px] text-primary hover:underline"
                >
                  {showPreview ? t("common.hide") || "Hide" : t("messages.preview")}
                </button>
              )
            }
          >
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="resize-y min-h-[100px] max-h-[40vh]"
            />
          </Field>

          {/* Preview — collapsible, capped height */}
          {showPreview && previewText && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
              {previewText}
            </div>
          )}
        </div>

        {/* Footer — sticky bottom */}
        <DialogFooter className="px-5 py-3 border-t border-border bg-background">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
            {sendNow ? (
              <>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {t("messages.sendNow")}
              </>
            ) : (
              t("messages.schedule")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Compact label + control wrapper used throughout the form. Keeps the label
// row at a fixed height so columns line up across the 2-col grids.
function Field({
  label,
  required,
  trailing,
  children,
}: {
  label: string;
  required?: boolean;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 h-4">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {trailing}
      </div>
      {children}
    </div>
  );
}
