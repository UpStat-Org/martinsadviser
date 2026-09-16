import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, FileText, Link2, Loader2, Pencil, Plus, Repeat, Send, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { DocumentLink } from "@/components/DocumentLink";
import { TaskTimeLogger } from "@/components/TaskTimeLogger";
import { ServiceOrderFormDialog } from "@/components/ServiceOrderFormDialog";
import {
  useAddChecklistItem,
  useAddServiceOrderNote,
  useCreateServiceOrder,
  useDeleteChecklistItem,
  useLinkServiceOrderPermit,
  useServiceOrder,
  useServiceOrderChecklist,
  useServiceOrderEvents,
  useServiceOrderPermits,
  useServiceOrderTime,
  useUnlinkServiceOrderPermit,
  useUpdateChecklistItem,
  useUpdateServiceOrder,
  useUploadChecklistDocument,
} from "@/hooks/useServiceOrders";
import { usePermits } from "@/hooks/usePermits";
import { useCreateTask, useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegion } from "@/hooks/useRegion";
import {
  CHECKLIST_STATUSES,
  checklistProgress,
  formatServiceOrderNumber,
  isServiceOrderOverdue,
  SERVICE_ORDER_STATUSES,
  SERVICE_ORDER_STATUS_TONE,
  serviceOrderFinancials,
  type ChecklistStatus,
  type ServiceOrderStatus,
} from "@/lib/serviceOrders";

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { role } = useAuth();
  const { currentOrg } = useOrg();
  const { money, dateNumeric, dateTimeNumeric } = useRegion();
  const { data: order, isLoading, error } = useServiceOrder(id);
  const { data: checklist } = useServiceOrderChecklist(id);
  const { data: linkedPermits } = useServiceOrderPermits(id);
  const { data: events } = useServiceOrderEvents(id);
  const { data: time } = useServiceOrderTime(id);
  const { data: tasks } = useTasks(id);
  const { data: clientPermits } = usePermits(undefined, order?.client_id);
  const updateOrder = useUpdateServiceOrder();
  const createOrder = useCreateServiceOrder();
  const addChecklist = useAddChecklistItem();
  const updateChecklist = useUpdateChecklistItem();
  const deleteChecklist = useDeleteChecklistItem();
  const uploadDocument = useUploadChecklistDocument();
  const linkPermit = useLinkServiceOrderPermit();
  const unlinkPermit = useUnlinkServiceOrderPermit();
  const addNote = useAddServiceOrderNote();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [editOpen, setEditOpen] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedPermit, setSelectedPermit] = useState("");
  const [note, setNote] = useState("");
  const isViewer = role === "viewer";

  const progress = checklistProgress(checklist ?? []);
  const financials = serviceOrderFinancials({
    quotedAmount: Number(order?.quoted_amount || 0),
    externalCost: Number(order?.external_cost || 0),
    minutes: time?.minutes || 0,
    hourlyRate: Number(currentOrg?.default_hourly_rate || 0),
  });
  const availablePermits = useMemo(() => {
    const linked = new Set(linkedPermits?.map((item) => item.permit_id));
    return clientPermits?.filter((permit) => !linked.has(permit.id)) ?? [];
  }, [clientPermits, linkedPermits]);

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin" /></div>;
  if (error || !order) return <Card><CardContent className="p-10 text-center"><p className="text-destructive">{error?.message || t("serviceOrders.notFound")}</p><Button variant="outline" className="mt-4" onClick={() => navigate("/service-orders")}>{t("common.back")}</Button></CardContent></Card>;

  const addChecklistItem = () => {
    if (!newChecklistTitle.trim()) return;
    addChecklist.mutate({ service_order_id: order.id, title: newChecklistTitle.trim(), required: true }, { onSuccess: () => setNewChecklistTitle("") });
  };
  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    createTask.mutate({ name: newTaskTitle.trim(), client_id: order.client_id, service_order_id: order.id, operator: order.assigned_to || undefined, due_date: order.due_date || undefined, priority: order.priority }, { onSuccess: () => setNewTaskTitle("") });
  };
  const submitNote = () => {
    if (!note.trim()) return;
    addNote.mutate({ orderId: order.id, note: note.trim() }, { onSuccess: () => setNote("") });
  };
  const createRenewal = () => {
    createOrder.mutate({
      order: {
        client_id: order.client_id,
        service_id: order.service_id,
        renewal_of_id: order.id,
        title: `${order.title} — ${t("serviceOrders.renewalSuffix")}`,
        description: order.description,
        status: "requested",
        priority: order.priority,
        assigned_to: order.assigned_to,
        due_date: null,
        sla_hours: order.sla_hours,
        quoted_amount: order.quoted_amount,
        external_cost: 0,
        currency: order.currency,
      },
      permitIds: linkedPermits?.map((item) => item.permit_id) ?? [],
      checklist: checklist?.map((item) => ({ title: item.title, required: item.required, due_date: null })) ?? [],
    }, { onSuccess: (created) => navigate(`/service-orders/${created.id}`) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-md border bg-card p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/service-orders")} aria-label={t("common.back")}><ArrowLeft /></Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{formatServiceOrderNumber(order.order_number)}</span>
              <StatusBadge tone={SERVICE_ORDER_STATUS_TONE[order.status as ServiceOrderStatus]}>{t(`serviceOrders.status.${order.status}`)}</StatusBadge>
              {isServiceOrderOverdue(order) && <StatusBadge tone="danger">{t("serviceOrders.overdue")}</StatusBadge>}
            </div>
            <h1 className="text-2xl font-semibold mt-1">{order.title}</h1>
            <p className="text-sm text-muted-foreground"><Link className="hover:underline" to={`/clients/${order.client_id}`}>{order.clients?.company_name}</Link>{order.services?.name ? ` · ${order.services.name}` : ""}</p>
          </div>
        </div>
        {!isViewer && <div className="flex flex-wrap gap-2">
          <Select value={order.status} onValueChange={(status) => updateOrder.mutate({ id: order.id, status })} disabled={updateOrder.isPending}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent>{SERVICE_ORDER_STATUSES.map((status) => <SelectItem key={status} value={status}>{t(`serviceOrders.status.${status}`)}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={createRenewal} disabled={createOrder.isPending}><Repeat />{t("serviceOrders.createRenewal")}</Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil />{t("common.edit")}</Button>
        </div>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          [t("serviceOrders.quotedAmount"), money(order.quoted_amount)],
          [t("serviceOrders.externalCost"), money(order.external_cost)],
          [t("serviceOrders.laborCost"), money(financials.laborCost)],
          [t("serviceOrders.totalCost"), money(financials.totalCost)],
          [t("serviceOrders.margin"), money(financials.margin)],
        ].map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold mt-1">{value}</p></CardContent></Card>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{t("serviceOrders.checklist")}</CardTitle><span className="text-xs text-muted-foreground">{progress.complete}/{progress.total}</span></div><Progress value={progress.percentage} className="h-2" /></CardHeader>
            <CardContent className="space-y-3">
              {!checklist?.length && <p className="text-sm text-muted-foreground py-3 text-center">{t("serviceOrders.noChecklist")}</p>}
              {checklist?.map((item) => <div key={item.id} className="rounded-md border p-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{item.title}</p><div className="flex gap-2 mt-1 text-xs text-muted-foreground">{item.required && <span>{t("serviceOrders.required")}</span>}{item.file_name && <DocumentLink path={item.document_path} className="text-primary hover:underline inline-flex items-center gap-1"><FileText className="w-3 h-3" />{item.file_name}</DocumentLink>}</div>{item.rejection_reason && <p className="text-xs text-destructive mt-1">{item.rejection_reason}</p>}</div>
                <Select value={item.status} onValueChange={(status) => updateChecklist.mutate({ id: item.id, status: status as ChecklistStatus })} disabled={isViewer}><SelectTrigger className="w-full sm:w-40 h-9"><SelectValue /></SelectTrigger><SelectContent>{CHECKLIST_STATUSES.map((status) => <SelectItem key={status} value={status}>{t(`serviceOrders.checklistStatus.${status}`)}</SelectItem>)}</SelectContent></Select>
                {!isViewer && <div className="flex gap-1">
                  <label className="inline-flex"><input type="file" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadDocument.mutate({ item, file }); e.target.value = ""; }} /><Button variant="outline" size="icon" asChild><span title={t("serviceOrders.uploadDocument")}><Upload /></span></Button></label>
                  <Button variant="ghost" size="icon" onClick={() => deleteChecklist.mutate({ id: item.id, orderId: order.id })}><Trash2 className="text-destructive" /></Button>
                </div>}
              </div>)}
              {!isViewer && <div className="flex gap-2 pt-2"><Input value={newChecklistTitle} onChange={(e) => setNewChecklistTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChecklistItem()} placeholder={t("serviceOrders.newChecklistItem")} /><Button onClick={addChecklistItem} disabled={!newChecklistTitle.trim() || addChecklist.isPending}><Plus /></Button></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock3 className="w-4 h-4" />{t("serviceOrders.tasksAndHours")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between rounded-md bg-muted p-3 text-sm"><span>{t("serviceOrders.totalHours")}</span><strong>{((time?.minutes || 0) / 60).toFixed(1)}h</strong></div>
              {!tasks?.length && <p className="text-sm text-muted-foreground py-3 text-center">{t("serviceOrders.noTasks")}</p>}
              {tasks?.map((task) => <div key={task.id} className="rounded-md border p-3">
                <div className="flex items-center gap-3"><p className="flex-1 font-medium text-sm">{task.name}</p><Select value={task.status} onValueChange={(status) => updateTask.mutate({ id: task.id, status })} disabled={isViewer}><SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_started">{t("kanban.column.notStarted")}</SelectItem><SelectItem value="waiting">{t("kanban.column.waiting")}</SelectItem><SelectItem value="in_progress">{t("kanban.column.inProgress")}</SelectItem><SelectItem value="completed">{t("kanban.column.completed")}</SelectItem></SelectContent></Select></div>
                {!isViewer && <TaskTimeLogger taskId={task.id} clientId={task.client_id} />}
              </div>)}
              {!isViewer && <div className="flex gap-2 pt-2"><Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder={t("serviceOrders.newTask")} /><Button onClick={addTask} disabled={!newTaskTitle.trim() || createTask.isPending}><Plus /></Button></div>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="w-4 h-4" />{t("serviceOrders.relatedPermits")}</CardTitle></CardHeader><CardContent className="space-y-2">
            {!linkedPermits?.length && <p className="text-sm text-muted-foreground">{t("serviceOrders.noPermits")}</p>}
            {linkedPermits?.map((item) => <div key={item.permit_id} className="flex items-center gap-2 rounded-md border p-2"><Link to={`/permits/${item.permit_id}`} className="flex-1 min-w-0 text-sm hover:underline truncate">{item.permits?.permit_type}{item.permits?.permit_number ? ` #${item.permits.permit_number}` : ""}</Link>{!isViewer && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => unlinkPermit.mutate({ orderId: order.id, permitId: item.permit_id })}><Trash2 className="text-destructive" /></Button>}</div>)}
            {!isViewer && availablePermits.length > 0 && <div className="flex gap-2 pt-2"><Select value={selectedPermit} onValueChange={setSelectedPermit}><SelectTrigger><SelectValue placeholder={t("serviceOrders.selectPermit")} /></SelectTrigger><SelectContent>{availablePermits.map((permit) => <SelectItem key={permit.id} value={permit.id}>{permit.permit_type}{permit.permit_number ? ` #${permit.permit_number}` : ""}</SelectItem>)}</SelectContent></Select><Button size="icon" onClick={() => selectedPermit && linkPermit.mutate({ orderId: order.id, permitId: selectedPermit }, { onSuccess: () => setSelectedPermit("") })}><Plus /></Button></div>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">{t("serviceOrders.details")}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">{t("serviceOrders.priority")}</span><span>{t(`serviceOrders.priority.${order.priority}`)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">{t("serviceOrders.dueDate")}</span><span>{order.due_date ? dateNumeric(new Date(`${order.due_date}T12:00:00`)) : "—"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">{t("serviceOrders.slaHours")}</span><span>{order.sla_hours ?? "—"}</span></div>
            {order.renewal_of_id && <div className="pt-2 border-t"><Link to={`/service-orders/${order.renewal_of_id}`} className="text-primary hover:underline">{t("serviceOrders.renewalOf")}</Link></div>}
            {order.description && <div className="pt-2 border-t"><p className="text-muted-foreground mb-1">{t("serviceOrders.description")}</p><p className="whitespace-pre-wrap">{order.description}</p></div>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">{t("serviceOrders.history")}</CardTitle></CardHeader><CardContent className="space-y-3">
            {!isViewer && <div className="flex gap-2"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("serviceOrders.addNote")} /><Button size="icon" onClick={submitNote} disabled={!note.trim() || addNote.isPending}><Send /></Button></div>}
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {events?.map((event) => <div key={event.id} className="border-l-2 pl-3 py-1"><p className="text-sm font-medium">{event.note || t(`serviceOrders.event.${event.event_type}`)}</p>{event.event_type === "status_changed" && event.from_value && event.to_value && <p className="text-xs text-muted-foreground">{t(`serviceOrders.status.${event.from_value}`)} → {t(`serviceOrders.status.${event.to_value}`)}</p>}<p className="text-[10px] text-muted-foreground mt-1">{dateTimeNumeric(new Date(event.created_at))}</p></div>)}
            </div>
          </CardContent></Card>
        </div>
      </div>

      <ServiceOrderFormDialog open={editOpen} onOpenChange={setEditOpen} order={order} />
    </div>
  );
}
