import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Clock3, FileWarning, Loader2, Plus, Search, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ServiceOrderFormDialog } from "@/components/ServiceOrderFormDialog";
import { useServiceOrders } from "@/hooks/useServiceOrders";
import { employeeName, useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegion } from "@/hooks/useRegion";
import {
  checklistProgress,
  formatServiceOrderNumber,
  isClosedServiceOrder,
  isServiceOrderOverdue,
  SERVICE_ORDER_PRIORITIES,
  SERVICE_ORDER_STATUSES,
  SERVICE_ORDER_STATUS_TONE,
  type ServiceOrderStatus,
} from "@/lib/serviceOrders";

export default function ServiceOrdersPage() {
  const { t } = useLanguage();
  const { role } = useAuth();
  const { moneyCompact, dateNumeric } = useRegion();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const { data: orders, isLoading, error } = useServiceOrders({ search, status, priority });
  const { data: employees } = useEmployees();
  const employeeMap = useMemo(() => new Map(employees?.map((employee) => [employee.id, employee])), [employees]);
  const isViewer = role === "viewer";

  const metrics = useMemo(() => {
    const all = orders ?? [];
    return {
      open: all.filter((order) => !isClosedServiceOrder(order.status)).length,
      documents: all.filter((order) => order.status === "waiting_documents").length,
      overdue: all.filter((order) => isServiceOrderOverdue(order)).length,
      quoted: all.filter((order) => !isClosedServiceOrder(order.status)).reduce((sum, order) => sum + Number(order.quoted_amount || 0), 0),
    };
  }, [orders]);
  const metricCards: Array<{ label: string; value: string | number; icon: LucideIcon }> = [
    { label: t("serviceOrders.open"), value: metrics.open, icon: BriefcaseBusiness },
    { label: t("serviceOrders.waitingDocuments"), value: metrics.documents, icon: FileWarning },
    { label: t("serviceOrders.overdue"), value: metrics.overdue, icon: Clock3 },
    { label: t("serviceOrders.openValue"), value: moneyCompact(metrics.quoted), icon: BriefcaseBusiness },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-md border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-md border bg-muted flex items-center justify-center"><BriefcaseBusiness className="w-6 h-6" /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("serviceOrders.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("serviceOrders.subtitle")}</p>
          </div>
        </div>
        {!isViewer && <Button onClick={() => setFormOpen(true)}><Plus />{t("serviceOrders.new")}</Button>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-1">{value}</p></div><Icon className="w-5 h-5 text-muted-foreground" /></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("serviceOrders.search")} /></div>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="md:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("serviceOrders.allStatuses")}</SelectItem>{SERVICE_ORDER_STATUSES.map((item) => <SelectItem key={item} value={item}>{t(`serviceOrders.status.${item}`)}</SelectItem>)}</SelectContent></Select>
          <Select value={priority} onValueChange={setPriority}><SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("serviceOrders.allPriorities")}</SelectItem>{SERVICE_ORDER_PRIORITIES.map((item) => <SelectItem key={item} value={item}>{t(`serviceOrders.priority.${item}`)}</SelectItem>)}</SelectContent></Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : error ? (
        <Card><CardContent className="p-8 text-center text-destructive">{error.message}</CardContent></Card>
      ) : !orders?.length ? (
        <EmptyState icon={<BriefcaseBusiness className="w-9 h-9" />} title={t("serviceOrders.empty")} description={t("serviceOrders.emptyDesc")} action={!isViewer ? <Button onClick={() => setFormOpen(true)}><Plus />{t("serviceOrders.new")}</Button> : undefined} />
      ) : (
        <Card className="overflow-hidden"><CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader><TableRow>
              <TableHead>{t("serviceOrders.order")}</TableHead><TableHead>{t("serviceOrders.client")}</TableHead><TableHead>{t("common.status")}</TableHead><TableHead>{t("serviceOrders.progress")}</TableHead><TableHead>{t("serviceOrders.assignee")}</TableHead><TableHead>{t("serviceOrders.dueDate")}</TableHead><TableHead className="text-right">{t("serviceOrders.value")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>{orders.map((order) => {
              const progress = checklistProgress(order.service_order_checklist_items);
              const overdue = isServiceOrderOverdue(order);
              return <TableRow key={order.id} className="cursor-pointer" onClick={() => navigate(`/service-orders/${order.id}`)}>
                <TableCell><div className="font-medium">{order.title}</div><div className="text-xs text-muted-foreground font-mono">{formatServiceOrderNumber(order.order_number)}{order.services?.name ? ` · ${order.services.name}` : ""}</div></TableCell>
                <TableCell>{order.clients?.company_name ?? "—"}</TableCell>
                <TableCell><StatusBadge tone={SERVICE_ORDER_STATUS_TONE[order.status as ServiceOrderStatus]}>{t(`serviceOrders.status.${order.status}`)}</StatusBadge></TableCell>
                <TableCell><div className="w-28 space-y-1"><div className="text-xs text-muted-foreground">{progress.complete}/{progress.total}</div><Progress value={progress.percentage} className="h-1.5" /></div></TableCell>
                <TableCell>{employeeName(employeeMap.get(order.assigned_to || ""))}</TableCell>
                <TableCell className={overdue ? "text-destructive font-medium" : ""}>{order.due_date ? dateNumeric(new Date(`${order.due_date}T12:00:00`)) : "—"}{overdue && <div className="text-[10px]">{t("serviceOrders.overdue")}</div>}</TableCell>
                <TableCell className="text-right font-medium">{moneyCompact(order.quoted_amount)}</TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
        </CardContent></Card>
      )}

      <ServiceOrderFormDialog open={formOpen} onOpenChange={setFormOpen} onCreated={(id) => navigate(`/service-orders/${id}`)} />
    </div>
  );
}
