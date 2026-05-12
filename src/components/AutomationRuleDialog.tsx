import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateAutomationRule, useUpdateAutomationRule } from "@/hooks/useAutomationRules";
import type { AutomationRule } from "@/hooks/useAutomationRules";
import { useMessageTemplates } from "@/hooks/useMessages";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AutomationRule | null;
}

const DAYS_OPTIONS = [15, 30, 45, 60, 90, 120];

const PLACEHOLDERS = [
  "{company_name}", "{dot}", "{mc}", "{ein}", "{email}", "{phone}",
  "{permit_type}", "{permit_number}", "{expiration_date}", "{state}", "{days_before}",
];

export default function AutomationRuleDialog({ open, onOpenChange, rule }: Props) {
  const [name, setName] = useState("");
  const [daysBefore, setDaysBefore] = useState(30);
  const [channel, setChannel] = useState("email");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [enabled, setEnabled] = useState(true);

  const { data: templates } = useMessageTemplates();
  const createRule = useCreateAutomationRule();
  const updateRule = useUpdateAutomationRule();
  const { t } = useLanguage();

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setDaysBefore(rule.days_before);
      setChannel(rule.channel);
      setTemplateId(rule.template_id);
      setSubject(rule.subject || "");
      setBody(rule.body);
      setEnabled(rule.enabled);
    } else {
      setName("");
      setDaysBefore(30);
      setChannel("email");
      setTemplateId(null);
      setSubject("");
      setBody("Olá {company_name},\n\nSeu permit {permit_type} ({permit_number}) vence em {days_before} dias ({expiration_date}).\n\nPor favor, entre em contato para renovação.");
      setEnabled(true);
    }
  }, [rule, open]);

  const handleTemplateSelect = (tid: string) => {
    if (tid === "none") {
      setTemplateId(null);
      return;
    }
    setTemplateId(tid);
    const t = templates?.find((t) => t.id === tid);
    if (t) {
      setSubject(t.subject || "");
      setBody(t.body);
      setChannel(t.channel);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !body.trim()) return;
    const payload = {
      name: name.trim(),
      days_before: daysBefore,
      channel,
      template_id: templateId,
      subject: subject.trim() || null,
      body: body.trim(),
      enabled,
    };
    if (rule) {
      updateRule.mutate({ id: rule.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createRule.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? t("messages.automation.edit") : t("messages.automation.newExpiration")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("messages.automation.ruleName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("messages.automation.ruleNamePlaceholder")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("messages.daysBeforeExpiration")}</Label>
              <Select value={String(daysBefore)} onValueChange={(v) => setDaysBefore(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} {t("common.days")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
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
          </div>

          <div>
            <Label>{t("messages.template.optional")}</Label>
            <Select value={templateId || "none"} onValueChange={handleTemplateSelect}>
              <SelectTrigger><SelectValue placeholder={t("common.none")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("common.none")}</SelectItem>
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {channel === "email" && (
            <div>
              <Label>{t("messages.subject")}</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("messages.subjectPlaceholder")} />
            </div>
          )}

          <div>
            <Label>{t("messages.body")}</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
            <div className="flex flex-wrap gap-1 mt-2">
              {PLACEHOLDERS.map((p) => (
                <Badge key={p} variant="outline" className="text-xs cursor-pointer hover:bg-accent"
                  onClick={() => setBody((prev) => prev + p)}>
                  {p}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label>{t("common.enabled")}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={!name.trim() || !body.trim()}>
            {rule ? t("common.save") : t("messages.createAutomation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
