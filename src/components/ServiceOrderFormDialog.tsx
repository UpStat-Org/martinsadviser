import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";
import { employeeName, useEmployees } from "@/hooks/useEmployees";
import { usePermits } from "@/hooks/usePermits";
import { useCreateServiceOrder, useUpdateServiceOrder, type ServiceOrder } from "@/hooks/useServiceOrders";
import { SERVICE_ORDER_PRIORITIES, SERVICE_ORDER_STATUSES, type ServiceOrderPriority, type ServiceOrderStatus } from "@/lib/serviceOrders";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegion } from "@/hooks/useRegion";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: ServiceOrder | null;
  onCreated?: (id: string) => void;
};

const emptyForm = {
  client_id: "",
  service_id: "none",
  title: "",
  description: "",
  status: "requested" as ServiceOrderStatus,
  priority: "normal" as ServiceOrderPriority,
  assigned_to: "none",
  due_date: "",
  sla_hours: "",
  quoted_amount: "",
  external_cost: "",
};

export function ServiceOrderFormDialog({ open, onOpenChange, order, onCreated }: Props) {
  const { t } = useLanguage();
  const { currency } = useRegion();
  const createOrder = useCreateServiceOrder();
  const updateOrder = useUpdateServiceOrder();
  const { data: clients } = useClients();
  const { data: services } = useServices(true);
  const { data: employees } = useEmployees();
  const [form, setForm] = useState(emptyForm);
  const [permitIds, setPermitIds] = useState<string[]>([]);
  const [checklistText, setChecklistText] = useState("");
  const { data: permits } = usePermits(undefined, form.client_id || undefined);

  useEffect(() => {
    if (!open) return;
    setPermitIds([]);
    setChecklistText("");
    setForm(order ? {
      client_id: order.client_id,
      service_id: order.service_id || "none",
      title: order.title,
      description: order.description || "",
      status: order.status as ServiceOrderStatus,
      priority: order.priority as ServiceOrderPriority,
      assigned_to: order.assigned_to || "none",
      due_date: order.due_date || "",
      sla_hours: order.sla_hours == null ? "" : String(order.sla_hours),
      quoted_amount: String(order.quoted_amount ?? 0),
      external_cost: String(order.external_cost ?? 0),
    } : emptyForm);
  }, [open, order]);

  const selectedService = useMemo(
    () => services?.find((service) => service.id === form.service_id),
    [services, form.service_id],
  );

  const selectService = (serviceId: string) => {
    const service = services?.find((item) => item.id === serviceId);
    setForm((current) => ({
      ...current,
      service_id: serviceId,
      title: current.title || service?.name || "",
      quoted_amount: current.quoted_amount || (service ? String(service.default_price) : ""),
    }));
  };

  const togglePermit = (id: string, checked: boolean) => {
    setPermitIds((current) => checked ? [...current, id] : current.filter((permitId) => permitId !== id));
  };

  const submit = () => {
    if (!form.client_id || !form.title.trim()) return;
    const payload = {
      client_id: form.client_id,
      service_id: form.service_id === "none" ? null : form.service_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      assigned_to: form.assigned_to === "none" ? null : form.assigned_to,
      due_date: form.due_date || null,
      sla_hours: form.sla_hours ? Number(form.sla_hours) : null,
      quoted_amount: Number(form.quoted_amount) || 0,
      external_cost: Number(form.external_cost) || 0,
      currency,
    };

    if (order) {
      updateOrder.mutate({ id: order.id, ...payload }, { onSuccess: () => onOpenChange(false) });
      return;
    }
    const checklist = checklistText.split("\n").map((title) => title.trim()).filter(Boolean).map((title) => ({ title, required: true }));
    createOrder.mutate({ order: payload, permitIds, checklist }, {
      onSuccess: (created) => {
        onOpenChange(false);
        onCreated?.(created.id);
      },
    });
  };

  const pending = createOrder.isPending || updateOrder.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(order ? "serviceOrders.edit" : "serviceOrders.new")}</DialogTitle>
          <DialogDescription>{t(order ? "serviceOrders.editDesc" : "serviceOrders.newDesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("serviceOrders.client")} *</Label>
            <Select value={form.client_id} onValueChange={(value) => setForm((f) => ({ ...f, client_id: value }))} disabled={!!order}>
              <SelectTrigger><SelectValue placeholder={t("serviceOrders.selectClient")} /></SelectTrigger>
              <SelectContent>{clients?.map((client) => <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("serviceOrders.service")}</Label>
            <Select value={form.service_id} onValueChange={selectService}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("serviceOrders.noService")}</SelectItem>
                {services?.map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("serviceOrders.titleField")} *</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={selectedService?.name} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("serviceOrders.description")}</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>{t("common.status")}</Label>
            <Select value={form.status} onValueChange={(value) => setForm((f) => ({ ...f, status: value as ServiceOrderStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_ORDER_STATUSES.map((status) => <SelectItem key={status} value={status}>{t(`serviceOrders.status.${status}`)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("serviceOrders.priority")}</Label>
            <Select value={form.priority} onValueChange={(value) => setForm((f) => ({ ...f, priority: value as ServiceOrderPriority }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_ORDER_PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{t(`serviceOrders.priority.${priority}`)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("serviceOrders.assignee")}</Label>
            <Select value={form.assigned_to} onValueChange={(value) => setForm((f) => ({ ...f, assigned_to: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("serviceOrders.unassigned")}</SelectItem>
                {employees?.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employeeName(employee)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("serviceOrders.dueDate")}</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>{t("serviceOrders.slaHours")}</Label>
            <Input type="number" min="1" step="1" value={form.sla_hours} onChange={(e) => setForm((f) => ({ ...f, sla_hours: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>{t("serviceOrders.quotedAmount")}</Label>
            <Input type="number" min="0" step="0.01" value={form.quoted_amount} onChange={(e) => setForm((f) => ({ ...f, quoted_amount: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>{t("serviceOrders.externalCost")}</Label>
            <Input type="number" min="0" step="0.01" value={form.external_cost} onChange={(e) => setForm((f) => ({ ...f, external_cost: e.target.value }))} />
          </div>

          {!order && form.client_id && permits && permits.length > 0 && (
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("serviceOrders.relatedPermits")}</Label>
              <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                {permits.map((permit) => (
                  <label key={permit.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={permitIds.includes(permit.id)} onCheckedChange={(value) => togglePermit(permit.id, value === true)} />
                    <span>{permit.permit_type}{permit.permit_number ? ` #${permit.permit_number}` : ""}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {!order && (
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("serviceOrders.initialChecklist")}</Label>
              <Textarea value={checklistText} onChange={(e) => setChecklistText(e.target.value)} rows={4} placeholder={t("serviceOrders.checklistPlaceholder")} />
              <p className="text-xs text-muted-foreground">{t("serviceOrders.onePerLine")}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={pending || !form.client_id || !form.title.trim()}>
            {pending && <Loader2 className="animate-spin" />}{t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
