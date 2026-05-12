import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTemplate, useUpdateTemplate, type MessageTemplate } from "@/hooks/useMessages";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: MessageTemplate | null;
}

export default function MessageTemplateDialog({ open, onOpenChange, template }: Props) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const isEdit = !!template;
  const { t } = useLanguage();

  useEffect(() => {
    if (template) {
      setName(template.name);
      setChannel(template.channel);
      setSubject(template.subject || "");
      setBody(template.body);
    } else {
      setName(""); setChannel("email"); setSubject(""); setBody("");
    }
  }, [template, open]);

  const handleSubmit = () => {
    const payload = { name, channel, subject: subject || null, body };
    if (isEdit) {
      update.mutate({ id: template!.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const placeholders = ["{company_name}", "{dot}", "{mc}", "{permit_type}", "{expiration_date}"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("messages.template.edit") : t("messages.template.new")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("common.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("messages.template.namePlaceholder")} />
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
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("messages.subjectPlaceholder")} />
            </div>
          )}
          <div className="space-y-2">
            <Label>{t("messages.body")}</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder={t("messages.bodyPlaceholder")} />
            <div className="flex flex-wrap gap-1">
              {placeholders.map((p) => (
                <Button key={p} type="button" variant="outline" size="sm" className="text-xs h-6"
                  onClick={() => setBody((prev) => prev + p)}>
                  {p}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!name || !body || create.isPending || update.isPending}>
            {isEdit ? t("common.save") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
