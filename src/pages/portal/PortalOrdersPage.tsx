import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AlertCircle, BriefcaseBusiness, Clock3, FileWarning, Loader2, Plus, Repeat, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { usePortalCreateOrder, usePortalOrders, usePortalServices } from "@/hooks/usePortal";
import { usePermits } from "@/hooks/usePermits";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegion } from "@/hooks/useRegion";
import { formatServiceOrderNumber, isClosedServiceOrder, isServiceOrderOverdue, SERVICE_ORDER_STATUS_TONE, type ServiceOrderStatus } from "@/lib/serviceOrders";
import type { PortalOutletContext } from "./PortalLayout";
import type { PortalOrderListItem } from "@/hooks/usePortal";

export default function PortalOrdersPage() {
  const { clientId } = useOutletContext<PortalOutletContext>();
  const { t } = useLanguage();
  const { dateNumeric, money } = useRegion();
  const navigate = useNavigate();
  const { data: orders, isLoading, error } = usePortalOrders();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renewalId, setRenewalId] = useState<string | undefined>();

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return orders ?? [];
    return (orders ?? []).filter((order) => `${order.title} ${order.service_name ?? ""} ${order.order_number}`.toLocaleLowerCase().includes(term));
  }, [orders, search]);
  const metrics = useMemo(() => ({
    open: (orders ?? []).filter((order) => !isClosedServiceOrder(order.status)).length,
    documents: (orders ?? []).reduce((sum, order) => sum + Number(order.pending_documents), 0),
    requests: (orders ?? []).reduce((sum, order) => sum + Number(order.open_requests), 0),
    overdue: (orders ?? []).filter((order) => isServiceOrderOverdue(order)).length,
  }), [orders]);
  const metricCards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: t("portal2.openProcesses"), value: metrics.open, icon: BriefcaseBusiness },
    { label: t("portal2.pendingDocuments"), value: metrics.documents, icon: FileWarning },
    { label: t("portal2.pendingRequests"), value: metrics.requests, icon: AlertCircle },
    { label: t("portal2.overdue"), value: metrics.overdue, icon: Clock3 },
  ];

  const openRequest = (sourceId?: string) => {
    setRenewalId(sourceId);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">{t("portal2.orders")}</h1><p className="text-sm text-muted-foreground mt-1">{t("portal2.ordersDesc")}</p></div>
        <Button onClick={() => openRequest()}><Plus />{t("portal2.requestService")}</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="p-4 flex justify-between"><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-1">{value}</p></div><Icon className="w-5 h-5 text-muted-foreground" /></CardContent></Card>)}
      </div>

      <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("portal2.searchOrders")} /></div>

      {isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : error ? <Card><CardContent className="p-8 text-center text-destructive">{error.message}</CardContent></Card> : !filtered.length ? (
        <EmptyState icon={<BriefcaseBusiness className="w-9 h-9" />} title={t("portal2.noOrders")} description={t("portal2.noOrdersDesc")} action={<Button onClick={() => openRequest()}><Plus />{t("portal2.requestService")}</Button>} />
      ) : <div className="grid gap-3 lg:grid-cols-2">{filtered.map((order) => {
        const overdue = isServiceOrderOverdue(order);
        return <Card key={order.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate(`/portal/orders/${order.id}`)}><CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium truncate">{order.title}</p><p className="text-xs text-muted-foreground font-mono mt-0.5">{formatServiceOrderNumber(order.order_number)}{order.service_name ? ` · ${order.service_name}` : ""}</p></div><StatusBadge tone={SERVICE_ORDER_STATUS_TONE[order.status as ServiceOrderStatus]}>{t(`serviceOrders.status.${order.status}`)}</StatusBadge></div>
          <div className="grid grid-cols-3 gap-2 text-xs"><div><span className="text-muted-foreground block">{t("serviceOrders.dueDate")}</span><span className={overdue ? "text-destructive font-medium" : ""}>{order.due_date ? dateNumeric(new Date(`${order.due_date}T12:00:00`)) : "—"}</span></div><div><span className="text-muted-foreground block">{t("portal2.requests")}</span><span>{order.open_requests}</span></div><div><span className="text-muted-foreground block">{t("portal2.value")}</span><span>{money(order.quoted_amount)}</span></div></div>
          <div className="flex items-center justify-between border-t pt-3"><div className="flex gap-2">{Number(order.pending_documents) > 0 && <StatusBadge tone="warning">{order.pending_documents} {t("portal2.documents")}</StatusBadge>}{Number(order.open_requests) > 0 && <StatusBadge tone="danger">{order.open_requests} {t("portal2.requests")}</StatusBadge>}</div><Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); openRequest(order.id); }}><Repeat />{t("portal2.renew")}</Button></div>
        </CardContent></Card>;
      })}</div>}

      <PortalServiceRequestDialog open={dialogOpen} onOpenChange={setDialogOpen} clientId={clientId} renewalOfId={renewalId} orders={orders ?? []} onCreated={(id) => navigate(`/portal/orders/${id}`)} />
    </div>
  );
}

function PortalServiceRequestDialog({ open, onOpenChange, clientId, renewalOfId, orders, onCreated }: {
  open: boolean; onOpenChange: (open: boolean) => void; clientId: string; renewalOfId?: string;
  orders: PortalOrderListItem[]; onCreated: (id: string) => void;
}) {
  const { t } = useLanguage();
  const { data: services } = usePortalServices();
  const { data: permits } = usePermits(undefined, clientId);
  const create = usePortalCreateOrder();
  const source = orders.find((order) => order.id === renewalOfId);
  const [serviceId, setServiceId] = useState("none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [permitIds, setPermitIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setServiceId("none");
    setTitle(source ? `${source.title} — ${t("serviceOrders.renewalSuffix")}` : "");
    setDescription("");
    setPermitIds([]);
  }, [open, source, t]);
  const submit = () => {
    if (!title.trim()) return;
    create.mutate({ title: title.trim(), description: description.trim(), serviceId: serviceId === "none" ? undefined : serviceId, renewalOfId, permitIds }, { onSuccess: (id) => { onOpenChange(false); onCreated(id); } });
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{renewalOfId ? t("portal2.requestRenewal") : t("portal2.requestService")}</DialogTitle><DialogDescription>{t("portal2.requestServiceDesc")}</DialogDescription></DialogHeader><div className="space-y-4">
    <div className="space-y-2"><Label>{t("serviceOrders.service")}</Label><Select value={serviceId} onValueChange={(value) => { setServiceId(value); const service = services?.find((item) => item.id === value); if (service && !title) setTitle(service.name); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{t("serviceOrders.noService")}</SelectItem>{services?.map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-2"><Label>{t("serviceOrders.titleField")} *</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} /></div>
    <div className="space-y-2"><Label>{t("serviceOrders.description")}</Label><Textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("portal2.describeNeed")} /></div>
    {!!permits?.length && <div className="space-y-2"><Label>{t("serviceOrders.relatedPermits")}</Label><div className="grid sm:grid-cols-2 gap-2 rounded-md border p-3">{permits.map((permit) => <label key={permit.id} className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={permitIds.includes(permit.id)} onCheckedChange={(checked) => setPermitIds((current) => checked === true ? [...new Set([...current, permit.id])] : current.filter((id) => id !== permit.id))} /><span className="truncate">{permit.permit_type}{permit.permit_number ? ` #${permit.permit_number}` : ""}</span></label>)}</div></div>}
    <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button onClick={submit} disabled={!title.trim() || create.isPending}>{create.isPending && <Loader2 className="animate-spin" />}{t("portal2.sendRequest")}</Button></div>
  </div></DialogContent></Dialog>;
}
