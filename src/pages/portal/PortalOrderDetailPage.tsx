import { useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Clock3, FileText, Loader2, PenLine, Send, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { DocumentLink } from "@/components/DocumentLink";
import { PortalSignatureDialog } from "@/components/PortalSignatureDialog";
import { usePortalAnswerQuestion, usePortalOrder, usePortalUploadChecklistDocument, type PortalChecklistItem } from "@/hooks/usePortal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegion } from "@/hooks/useRegion";
import { CHECKLIST_STATUSES, formatServiceOrderNumber, SERVICE_ORDER_STATUS_TONE, type ChecklistStatus, type ServiceOrderStatus } from "@/lib/serviceOrders";
import type { PortalOutletContext } from "./PortalLayout";
import { cn } from "@/lib/utils";

const FLOW = ["requested", "waiting_documents", "preparing", "submitted", "waiting_agency", "approved", "delivered"];

export default function PortalOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { orgId, userEmail } = useOutletContext<PortalOutletContext>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { dateNumeric, dateTimeNumeric, money } = useRegion();
  const { data: order, isLoading, error } = usePortalOrder(id);
  const upload = usePortalUploadChecklistDocument();
  const answerQuestion = usePortalAnswerQuestion();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [signing, setSigning] = useState<PortalChecklistItem | null>(null);

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin" /></div>;
  if (error || !order) return <Card><CardContent className="p-10 text-center"><p className="text-destructive">{error?.message || t("serviceOrders.notFound")}</p><Button className="mt-4" variant="outline" onClick={() => navigate("/portal/orders")}>{t("common.back")}</Button></CardContent></Card>;

  const currentStep = FLOW.indexOf(order.status);
  const pendingQuestions = order.questions.filter((question) => question.status === "pending");

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div className="flex gap-3"><Button variant="ghost" size="icon" onClick={() => navigate("/portal/orders")}><ArrowLeft /></Button><div><div className="flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{formatServiceOrderNumber(order.order_number)}</span><StatusBadge tone={SERVICE_ORDER_STATUS_TONE[order.status as ServiceOrderStatus]}>{t(`serviceOrders.status.${order.status}`)}</StatusBadge></div><h1 className="text-2xl font-semibold mt-1">{order.title}</h1><p className="text-sm text-muted-foreground">{order.service_name || t("serviceOrders.noService")}</p></div></div>{order.renewal_of_id && <Button variant="outline" asChild><Link to={`/portal/orders/${order.renewal_of_id}`}>{t("serviceOrders.renewalOf")}</Link></Button>}</div>

    <Card><CardHeader><CardTitle className="text-base">{t("portal2.processStage")}</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">{FLOW.map((status, index) => { const active = index <= currentStep && currentStep >= 0; return <div key={status} className="text-center"><div className={cn("mx-auto w-8 h-8 rounded-full border flex items-center justify-center", active ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground")}>{active ? <Check className="w-4 h-4" /> : index + 1}</div><p className={cn("text-[10px] mt-1.5", active ? "font-medium" : "text-muted-foreground")}>{t(`serviceOrders.status.${status}`)}</p></div>; })}</div>{order.status === "cancelled" && <div className="mt-4 text-center"><StatusBadge tone="danger">{t("serviceOrders.status.cancelled")}</StatusBadge></div>}</CardContent></Card>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
      [t("serviceOrders.assignee"), order.assignee_name || t("serviceOrders.unassigned")],
      [t("serviceOrders.dueDate"), order.due_date ? dateNumeric(new Date(`${order.due_date}T12:00:00`)) : "—"],
      [t("serviceOrders.slaHours"), order.sla_hours ? `${order.sla_hours}h` : "—"],
      [t("serviceOrders.quotedAmount"), money(order.quoted_amount)],
    ].map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold mt-1">{value}</p></CardContent></Card>)}</div>

    {pendingQuestions.length > 0 && <Card className="border-warning/40"><CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="w-4 h-4 text-warning" />{t("portal2.teamRequests")}</CardTitle></CardHeader><CardContent className="space-y-4">{pendingQuestions.map((question) => { const overdue = !!question.due_date && new Date(`${question.due_date}T23:59:59`) < new Date(); return <div key={question.id} className="rounded-md border p-4 space-y-3"><div className="flex justify-between gap-3"><p className="font-medium text-sm">{question.question}</p>{question.due_date && <StatusBadge tone={overdue ? "danger" : "warning"}><Clock3 className="w-3 h-3" />{dateNumeric(new Date(`${question.due_date}T12:00:00`))}</StatusBadge>}</div><Textarea value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder={t("portal2.writeAnswer")} /><div className="flex justify-end"><Button size="sm" onClick={() => answerQuestion.mutate({ orderId: order.id, questionId: question.id, answer: answers[question.id] ?? "" }, { onSuccess: () => setAnswers((current) => ({ ...current, [question.id]: "" })) })} disabled={!answers[question.id]?.trim() || answerQuestion.isPending}><Send />{t("portal2.sendAnswer")}</Button></div></div>; })}</CardContent></Card>}

    <div className="grid gap-6 xl:grid-cols-3"><div className="xl:col-span-2 space-y-6">
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />{t("serviceOrders.checklist")}</CardTitle></CardHeader><CardContent className="space-y-3">{!order.checklist.length && <p className="text-sm text-muted-foreground text-center py-6">{t("serviceOrders.noChecklist")}</p>}{order.checklist.map((item) => { const signature = order.signatures.find((entry) => entry.checklist_item_id === item.id); return <div key={item.id} className="rounded-md border p-3 space-y-3"><div className="flex flex-col sm:flex-row sm:items-center gap-3"><div className="flex-1 min-w-0"><p className="font-medium text-sm">{item.title}</p>{item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}{item.rejection_reason && <p className="text-xs text-destructive mt-1">{item.rejection_reason}</p>}</div><StatusBadge tone={item.status === "approved" ? "success" : item.status === "rejected" ? "danger" : item.status === "received" ? "info" : "warning"}>{t(`serviceOrders.checklistStatus.${item.status as ChecklistStatus}`)}</StatusBadge></div><div className="flex flex-wrap gap-2">{item.document_path && <DocumentLink path={item.document_path}><Button variant="outline" size="sm" asChild><span><FileText />{item.file_name || t("portal2.openDocument")}</span></Button></DocumentLink>}<label><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate({ orgId, orderId: order.id, itemId: item.id, file }); event.target.value = ""; }} /><Button size="sm" variant="outline" asChild><span><Upload />{item.document_path ? t("portal2.replaceDocument") : t("portal2.sendDocument")}</span></Button></label>{item.document_path && !signature && <Button size="sm" variant="outline" onClick={() => setSigning(item)}><PenLine />{t("portal2.sign")}</Button>}{signature && <StatusBadge tone="success"><CheckCircle2 className="w-3 h-3" />{t("portal2.signedBy")} {signature.signer_name}</StatusBadge>}</div></div>; })}</CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">{t("portal2.requestHistory")}</CardTitle></CardHeader><CardContent className="space-y-3">{order.questions.filter((question) => question.status !== "pending").map((question) => <div key={question.id} className="rounded-md border p-3"><div className="flex justify-between gap-2"><p className="text-sm font-medium">{question.question}</p><StatusBadge tone={question.status === "resolved" ? "success" : "info"}>{t(`portal2.questionStatus.${question.status}`)}</StatusBadge></div>{question.answer && <p className="mt-2 text-sm text-muted-foreground border-l-2 pl-3">{question.answer}</p>}</div>)}{!order.questions.some((question) => question.status !== "pending") && <p className="text-sm text-muted-foreground text-center py-4">{t("portal2.noAnsweredRequests")}</p>}</CardContent></Card>
    </div><div className="space-y-6">
      <Card><CardHeader><CardTitle className="text-base">{t("serviceOrders.relatedPermits")}</CardTitle></CardHeader><CardContent className="space-y-2">{order.permits.map((permit) => <div key={permit.id} className="rounded-md border p-3 text-sm"><p className="font-medium">{permit.permit_type}</p><p className="text-xs text-muted-foreground mt-1">{[permit.permit_number, permit.state].filter(Boolean).join(" · ") || "—"}</p></div>)}{!order.permits.length && <p className="text-sm text-muted-foreground">{t("serviceOrders.noPermits")}</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">{t("serviceOrders.history")}</CardTitle></CardHeader><CardContent className="space-y-3">{order.timeline.map((event) => <div key={event.id} className="border-l-2 pl-3"><p className="text-sm font-medium">{t(`serviceOrders.event.${event.event_type}`)}</p>{event.event_type === "status_changed" && event.from_value && event.to_value && <p className="text-xs text-muted-foreground">{t(`serviceOrders.status.${event.from_value}`)} → {t(`serviceOrders.status.${event.to_value}`)}</p>}<p className="text-[10px] text-muted-foreground mt-1">{dateTimeNumeric(new Date(event.created_at))}</p></div>)}</CardContent></Card>
      {order.description && <Card><CardHeader><CardTitle className="text-base">{t("serviceOrders.description")}</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap">{order.description}</p></CardContent></Card>}
    </div></div>

    {signing && <PortalSignatureDialog open={!!signing} onOpenChange={(open) => { if (!open) setSigning(null); }} orderId={order.id} itemId={signing.id} documentName={signing.file_name || signing.title} defaultEmail={userEmail} />}
  </div>;
}
