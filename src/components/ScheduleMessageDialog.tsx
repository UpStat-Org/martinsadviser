import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import { useMessageTemplates, useCreateScheduledMessage } from "@/hooks/useMessages";

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

  const { data: clients } = useClients();
  const { data: templates } = useMessageTemplates();
  const create = useCreateScheduledMessage();

  useEffect(() => {
    if (!open) {
      setClientId(""); setChannel("email"); setTemplateId(""); setSubject(""); setBody(""); setDate(undefined); setTime("09:00");
    }
  }, [open]);

  const handleTemplateChange = (tId: string) => {
    setTemplateId(tId);
    if (tId && tId !== "none") {
      const t = templates?.find((t) => t.id === tId);
      if (t) {
        setChannel(t.channel);
        setSubject(t.subject || "");
        setBody(t.body);
      }
    }
  };

  const handleSubmit = () => {
    if (!clientId || !body || !date) return;
    const [h, m] = time.split(":").map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(h, m, 0, 0);

    create.mutate({
      client_id: clientId,
      template_id: templateId && templateId !== "none" ? templateId : null,
      channel,
      subject: subject || null,
      body,
      scheduled_at: scheduledAt.toISOString(),
    }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agendar Mensagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template (opcional)</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger><SelectValue placeholder="Sem template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem template</SelectItem>
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Canal</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {channel === "email" && (
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!clientId || !body || !date || create.isPending}>
            Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
