import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, XCircle, Mail, Phone, MessageCircle, Eye } from "lucide-react";
import { useMessageTemplates, useDeleteTemplate, useScheduledMessages, useCancelScheduledMessage } from "@/hooks/useMessages";
import type { MessageTemplate } from "@/hooks/useMessages";
import MessageTemplateDialog from "@/components/MessageTemplateDialog";
import ScheduleMessageDialog from "@/components/ScheduleMessageDialog";
import { replacePlaceholders } from "@/lib/placeholders";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ScheduledMessage } from "@/hooks/useMessages";

const channelIcon = (ch: string) => {
  if (ch === "whatsapp") return <MessageCircle className="w-4 h-4 text-primary" />;
  if (ch === "sms") return <Phone className="w-4 h-4 text-primary" />;
  return <Mail className="w-4 h-4 text-accent-foreground" />;
};

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pendente", variant: "secondary" },
    sent: { label: "Enviada", variant: "default" },
    failed: { label: "Falhou", variant: "destructive" },
    cancelled: { label: "Cancelada", variant: "outline" },
  };
  const m = map[s] || { label: s, variant: "outline" as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
};

export default function Messages() {
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<MessageTemplate | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [previewMsg, setPreviewMsg] = useState<ScheduledMessage | null>(null);

  const { data: templates, isLoading: loadingT } = useMessageTemplates();
  const deleteTemplate = useDeleteTemplate();
  const { data: pendingMsgs, isLoading: loadingP } = useScheduledMessages("pending");
  const { data: sentMsgs, isLoading: loadingS } = useScheduledMessages();
  const cancelMsg = useCancelScheduledMessage();

  const sentAndFailed = sentMsgs?.filter((m) => m.status === "sent" || m.status === "failed") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Mensagens</h1>
          <p className="text-muted-foreground mt-1">Templates e agendamento de envios</p>
        </div>
        <Button onClick={() => setScheduleOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Mensagem
        </Button>
      </div>

      <Tabs defaultValue="scheduled">
        <TabsList>
          <TabsTrigger value="scheduled">Agendadas{pendingMsgs?.length ? ` (${pendingMsgs.length})` : ""}</TabsTrigger>
          <TabsTrigger value="sent">Enviadas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Agendadas */}
        <TabsContent value="scheduled">
          {loadingP ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">Carregando...</CardContent></Card>
          ) : !pendingMsgs?.length ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Nenhuma mensagem agendada.</p>
                <Button variant="outline" className="mt-4" onClick={() => setScheduleOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Agendar mensagem
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Agendada para</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMsgs.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{(m as any).clients?.company_name || "—"}</TableCell>
                      <TableCell><div className="flex items-center gap-1">{channelIcon(m.channel)} {m.channel}</div></TableCell>
                      <TableCell className="max-w-[200px] truncate">{replacePlaceholders(m.body, m.clients)}</TableCell>
                      <TableCell>{format(new Date(m.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell>{statusBadge(m.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setPreviewMsg(m)} title="Visualizar">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => cancelMsg.mutate(m.id)} title="Cancelar">
                            <XCircle className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Enviadas */}
        <TabsContent value="sent">
          {loadingS ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">Carregando...</CardContent></Card>
          ) : !sentAndFailed.length ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">Nenhuma mensagem enviada ainda.</CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Enviada em</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentAndFailed.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{(m as any).clients?.company_name || "—"}</TableCell>
                      <TableCell><div className="flex items-center gap-1">{channelIcon(m.channel)} {m.channel}</div></TableCell>
                      <TableCell className="max-w-[200px] truncate">{replacePlaceholders(m.body, m.clients)}</TableCell>
                      <TableCell>{m.sent_at ? format(new Date(m.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</TableCell>
                      <TableCell>{statusBadge(m.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditTemplate(null); setTemplateOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Template
            </Button>
          </div>
          {loadingT ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">Carregando...</CardContent></Card>
          ) : !templates?.length ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Nenhum template criado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium">
                        {channelIcon(t.channel)}
                        {t.name}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditTemplate(t); setTemplateOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTemplate.mutate(t.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {t.subject && <p className="text-xs text-muted-foreground">Assunto: {t.subject}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-3">{t.body}</p>
                    <Badge variant="outline" className="text-xs">{t.channel}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <MessageTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} template={editTemplate} />
      <ScheduleMessageDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </div>
  );
}
