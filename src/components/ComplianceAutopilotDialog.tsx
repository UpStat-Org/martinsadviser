import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Receipt,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import type { Client } from "@/hooks/useClients";
import type { Invoice } from "@/hooks/useInvoices";
import type { ScheduledMessage } from "@/hooks/useMessages";
import type { PermitWithRelations } from "@/hooks/usePermits";
import type { Truck } from "@/hooks/useTrucks";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ActionKind = "task" | "message";
type ActionTone = "critical" | "warning" | "info" | "success";

type AutopilotAction = {
  id: string;
  kind: ActionKind;
  tone: ActionTone;
  title: string;
  description: string;
  payload:
    | {
        type: "task";
        name: string;
        task_type: string;
        notes: string;
        due_date: string;
        priority: "high" | "medium" | "low";
      }
    | {
        type: "message";
        channel: "email" | "whatsapp";
        subject: string | null;
        body: string;
        scheduled_at: string;
      };
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  permits?: PermitWithRelations[];
  trucks?: Truck[];
  invoices?: (Invoice & { clients?: { company_name: string } })[];
  messages?: ScheduledMessage[];
};

const toneClass: Record<ActionTone, string> = {
  critical: "border-destructive/25 bg-destructive/5",
  warning: "border-warning/25 bg-warning/5",
  info: "border-sky-500/25 bg-sky-500/5",
  success: "border-success/25 bg-success/5",
};

const toneIcon: Record<ActionTone, typeof AlertTriangle> = {
  critical: AlertTriangle,
  warning: Clock,
  info: FileText,
  success: CheckCircle2,
};

function daysUntil(date: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function autopilotMessage(
  client: Client,
  criticalPermits: PermitWithRelations[],
  overdueInvoices: Invoice[],
) {
  const permitLines = criticalPermits
    .slice(0, 5)
    .map((p) => {
      const days = daysUntil(p.expiration_date);
      const status =
        days === null
          ? "missing expiration date"
          : days < 0
            ? `${Math.abs(days)} days overdue`
            : `expires in ${days} days`;
      return `- ${p.permit_type}${p.state ? ` ${p.state}` : ""}: ${status}`;
    })
    .join("\n");

  const invoiceLine = overdueInvoices.length
    ? `\n\nThere are also ${overdueInvoices.length} overdue invoice(s) pending review.`
    : "";

  return `Hello ${client.company_name},

We reviewed your compliance file and found items that need attention:

${permitLines || "- No critical permits found."}${invoiceLine}

Please send any updated documents or renewal information as soon as possible so we can keep your operation compliant.

MartinsAdviser`;
}

export function ComplianceAutopilotDialog({
  open,
  onOpenChange,
  client,
  permits = [],
  trucks = [],
  invoices = [],
  messages = [],
}: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);

  const analysis = useMemo(() => {
    const permitList = permits ?? [];
    const expired = permitList.filter((p) => {
      const days = daysUntil(p.expiration_date);
      return days !== null && days < 0;
    });
    const expiring = permitList.filter((p) => {
      const days = daysUntil(p.expiration_date);
      return days !== null && days >= 0 && days <= 30;
    });
    const missingDocuments = permitList.filter((p) => !p.document_url);
    const missingExpiration = permitList.filter((p) => !p.expiration_date);
    const overdueInvoices = invoices.filter(
      (i) => i.status !== "paid" && i.status !== "cancelled" && daysUntil(i.due_date) !== null && daysUntil(i.due_date)! < 0,
    );
    const failedMessages = messages.filter((m) => m.status === "failed");
    const missingContact = !client.email && !client.phone;
    const missingFleet = trucks.length === 0;

    const riskPoints =
      expired.length * 22 +
      expiring.length * 12 +
      missingDocuments.length * 6 +
      missingExpiration.length * 10 +
      overdueInvoices.length * 8 +
      failedMessages.length * 8 +
      (missingContact ? 12 : 0) +
      (missingFleet ? 8 : 0);
    const score = Math.max(0, Math.min(100, 100 - riskPoints));
    const level = score >= 80 ? "healthy" : score >= 55 ? "attention" : "critical";

    const criticalPermits = [...expired, ...expiring, ...missingExpiration];
    const actions: AutopilotAction[] = [];

    criticalPermits.slice(0, 6).forEach((permit) => {
      const days = daysUntil(permit.expiration_date);
      const isExpired = days !== null && days < 0;
      actions.push({
        id: `permit-${permit.id}`,
        kind: "task",
        tone: isExpired ? "critical" : "warning",
        title: t("autopilot.action.renewPermit").replace("{permit}", permit.permit_type),
        description:
          days === null
            ? t("autopilot.reason.noExpiration")
            : isExpired
              ? t("autopilot.reason.expired").replace("{days}", String(Math.abs(days)))
              : t("autopilot.reason.expiring").replace("{days}", String(days)),
        payload: {
          type: "task",
          name: `${t("autopilot.taskPrefix")} ${permit.permit_type} - ${client.company_name}`,
          task_type: permit.permit_type,
          notes: `[Autopilot] ${permit.permit_type} ${permit.permit_number || ""} ${permit.state || ""}. ${t("autopilot.taskNotes")}`,
          due_date: format(addDays(new Date(), isExpired ? 1 : 3), "yyyy-MM-dd"),
          priority: isExpired ? "high" : "medium",
        },
      });
    });

    missingDocuments.slice(0, 4).forEach((permit) => {
      actions.push({
        id: `doc-${permit.id}`,
        kind: "task",
        tone: "info",
        title: t("autopilot.action.collectDocument").replace("{permit}", permit.permit_type),
        description: t("autopilot.reason.missingDocument"),
        payload: {
          type: "task",
          name: `${t("autopilot.documentTaskPrefix")} ${permit.permit_type} - ${client.company_name}`,
          task_type: permit.permit_type,
          notes: `[Autopilot] ${t("autopilot.documentTaskNotes")}`,
          due_date: format(addDays(new Date(), 2), "yyyy-MM-dd"),
          priority: "medium",
        },
      });
    });

    if (overdueInvoices.length) {
      actions.push({
        id: "finance-review",
        kind: "task",
        tone: "warning",
        title: t("autopilot.action.financeReview"),
        description: t("autopilot.reason.overdueInvoices").replace("{count}", String(overdueInvoices.length)),
        payload: {
          type: "task",
          name: `${t("autopilot.financeTaskPrefix")} - ${client.company_name}`,
          task_type: "Finance",
          notes: `[Autopilot] ${t("autopilot.financeTaskNotes")}`,
          due_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
          priority: "high",
        },
      });
    }

    if (missingContact) {
      actions.push({
        id: "contact-review",
        kind: "task",
        tone: "critical",
        title: t("autopilot.action.updateContact"),
        description: t("autopilot.reason.noContact"),
        payload: {
          type: "task",
          name: `${t("autopilot.contactTaskPrefix")} - ${client.company_name}`,
          task_type: "Client",
          notes: `[Autopilot] ${t("autopilot.contactTaskNotes")}`,
          due_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
          priority: "high",
        },
      });
    }

    if (!missingContact && (criticalPermits.length || overdueInvoices.length)) {
      const channel = client.email ? "email" : "whatsapp";
      actions.unshift({
        id: "client-message",
        kind: "message",
        tone: "success",
        title: t("autopilot.action.messageClient"),
        description: channel === "email" ? t("autopilot.reason.emailReady") : t("autopilot.reason.whatsappReady"),
        payload: {
          type: "message",
          channel,
          subject: channel === "email" ? t("autopilot.messageSubject") : null,
          body: autopilotMessage(client, criticalPermits, overdueInvoices),
          scheduled_at: new Date().toISOString(),
        },
      });
    }

    if (!actions.length) {
      actions.push({
        id: "healthy-followup",
        kind: "task",
        tone: "success",
        title: t("autopilot.action.healthyFollowup"),
        description: t("autopilot.reason.healthy"),
        payload: {
          type: "task",
          name: `${t("autopilot.healthTaskPrefix")} - ${client.company_name}`,
          task_type: "Compliance",
          notes: `[Autopilot] ${t("autopilot.healthTaskNotes")}`,
          due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
          priority: "low",
        },
      });
    }

    return {
      expired,
      expiring,
      missingDocuments,
      overdueInvoices,
      failedMessages,
      score,
      level,
      actions,
    };
  }, [client, invoices, messages, permits, trucks, t]);

  const levelLabel =
    analysis.level === "healthy"
      ? t("compliance.healthy")
      : analysis.level === "attention"
        ? t("compliance.warning")
        : t("compliance.critical");

  const executePlan = async () => {
    setExecuting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t("toast.authRequired"));

      for (const action of analysis.actions) {
        if (action.payload.type === "task") {
          const task: TablesInsert<"tasks"> = {
            client_id: client.id,
            user_id: user.id,
            name: action.payload.name,
            task_type: action.payload.task_type,
            notes: action.payload.notes,
            due_date: action.payload.due_date,
            priority: action.payload.priority,
            status: "not_started",
            tags: ["autopilot"],
          };
          const { error } = await supabase.from("tasks").insert({
            ...task,
          });
          if (error) throw error;
        } else {
          const message: TablesInsert<"scheduled_messages"> = {
            client_id: client.id,
            user_id: user.id,
            channel: action.payload.channel,
            subject: action.payload.subject,
            body: action.payload.body,
            scheduled_at: action.payload.scheduled_at,
            status: "pending",
          };
          const { error } = await supabase.from("scheduled_messages").insert({
            ...message,
          });
          if (error) throw error;
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["scheduled_messages"] }),
        queryClient.invalidateQueries({ queryKey: ["client_messages", client.id] }),
      ]);
      setExecuted(true);
      toast({
        title: t("autopilot.executedTitle"),
        description: t("autopilot.executedDesc").replace("{count}", String(analysis.actions.length)),
      });
    } catch (e: unknown) {
      toast({
        title: t("autopilot.executeError"),
        description: getErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto rounded-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <span className="w-9 h-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center">
              <Bot className="w-4 h-4 text-secondary-foreground" />
            </span>
            {t("autopilot.title")}
          </DialogTitle>
          <DialogDescription>
            {t("autopilot.subtitle").replace("{client}", client.company_name)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <div className="space-y-4">
            <div className="rounded-md border border-border/50 bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("autopilot.riskScore")}
                </span>
                <Badge
                  className={cn(
                    analysis.level === "critical"
                      ? "bg-destructive text-white"
                      : analysis.level === "attention"
                        ? "bg-warning text-white"
                        : "bg-success text-white",
                  )}
                >
                  {levelLabel}
                </Badge>
              </div>
              <div className="text-5xl font-bold tracking-tight mb-3">
                {analysis.score}%
              </div>
              <Progress value={analysis.score} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t("autopilot.metric.expired"), value: analysis.expired.length, icon: AlertTriangle },
                { label: t("autopilot.metric.expiring"), value: analysis.expiring.length, icon: Clock },
                { label: t("autopilot.metric.docs"), value: analysis.missingDocuments.length, icon: FileText },
                { label: t("autopilot.metric.invoices"), value: analysis.overdueInvoices.length, icon: Receipt },
              ].map((m) => (
                <div key={m.label} className="rounded-md border border-border/50 bg-card p-3">
                  <m.icon className="w-4 h-4 text-muted-foreground mb-2" />
                  <div className="text-lg font-semibold">{m.value}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg">{t("autopilot.planTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("autopilot.planSubtitle")}</p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {analysis.actions.length} {t("autopilot.actions")}
              </Badge>
            </div>

            <div className="space-y-2">
              {analysis.actions.map((action) => {
                const Icon = action.kind === "message" ? (action.payload.type === "message" && action.payload.channel === "whatsapp" ? MessageCircle : Mail) : toneIcon[action.tone];
                return (
                  <div
                    key={action.id}
                    className={cn("rounded-md border p-3 flex gap-3", toneClass[action.tone])}
                  >
                    <div className="w-9 h-9 rounded-lg bg-background border border-border/60 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{action.title}</p>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {action.kind === "message" ? t("autopilot.kind.message") : t("autopilot.kind.task")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {executed ? t("common.close") : t("common.cancel")}
              </Button>
              <Button onClick={executePlan} disabled={executing || executed} className="gap-2">
                {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : executed ? <CheckCircle2 className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                {executed ? t("autopilot.executedButton") : t("autopilot.execute")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
