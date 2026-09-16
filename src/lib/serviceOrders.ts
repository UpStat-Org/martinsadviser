import type { Tables } from "@/integrations/supabase/types";
import type { StatusTone } from "@/components/StatusBadge";

export type ServiceOrderStatus =
  | "requested"
  | "waiting_documents"
  | "preparing"
  | "submitted"
  | "waiting_agency"
  | "approved"
  | "delivered"
  | "cancelled";

export type ServiceOrderPriority = "low" | "normal" | "high" | "urgent";
export type ChecklistStatus = "pending" | "received" | "approved" | "rejected" | "not_applicable";

export const SERVICE_ORDER_STATUSES: ServiceOrderStatus[] = [
  "requested",
  "waiting_documents",
  "preparing",
  "submitted",
  "waiting_agency",
  "approved",
  "delivered",
  "cancelled",
];

export const SERVICE_ORDER_PRIORITIES: ServiceOrderPriority[] = ["low", "normal", "high", "urgent"];
export const CHECKLIST_STATUSES: ChecklistStatus[] = ["pending", "received", "approved", "rejected", "not_applicable"];

export const SERVICE_ORDER_STATUS_TONE: Record<ServiceOrderStatus, StatusTone> = {
  requested: "neutral",
  waiting_documents: "warning",
  preparing: "info",
  submitted: "info",
  waiting_agency: "warning",
  approved: "success",
  delivered: "success",
  cancelled: "danger",
};

export function isClosedServiceOrder(status: string): boolean {
  return status === "delivered" || status === "cancelled";
}

export function isServiceOrderOverdue(
  order: Pick<Tables<"service_orders">, "due_date" | "status">,
  now = new Date(),
): boolean {
  if (!order.due_date || isClosedServiceOrder(order.status)) return false;
  const endOfDueDate = new Date(`${order.due_date}T23:59:59.999`);
  return endOfDueDate.getTime() < now.getTime();
}

export function checklistProgress(
  items: Array<Pick<Tables<"service_order_checklist_items">, "required" | "status">>,
): { complete: number; total: number; percentage: number } {
  const required = items.filter((item) => item.required && item.status !== "not_applicable");
  const complete = required.filter((item) => item.status === "approved").length;
  return {
    complete,
    total: required.length,
    percentage: required.length ? Math.round((complete / required.length) * 100) : 100,
  };
}

export function formatServiceOrderNumber(orderNumber: number): string {
  return `OS-${String(orderNumber).padStart(5, "0")}`;
}

export function serviceOrderFinancials({
  quotedAmount,
  externalCost,
  minutes,
  hourlyRate,
}: {
  quotedAmount: number;
  externalCost: number;
  minutes: number;
  hourlyRate: number;
}) {
  const laborCost = (minutes / 60) * hourlyRate;
  const totalCost = externalCost + laborCost;
  return { laborCost, totalCost, margin: quotedAmount - totalCost };
}
