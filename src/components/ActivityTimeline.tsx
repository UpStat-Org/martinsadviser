import { useActivityLog, type ActivityLog } from "@/hooks/useActivityLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileCheck, Truck, Building2, Mail, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt, enUS, es } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

interface ActivityTimelineProps {
  clientId: string;
}

const entityIcons: Record<string, typeof FileCheck> = {
  permit: FileCheck,
  truck: Truck,
  client: Building2,
  message: Mail,
};

const actionIcons: Record<string, typeof Plus> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
};

const actionColors: Record<string, string> = {
  created: "bg-success text-success-foreground",
  updated: "bg-primary text-primary-foreground",
  deleted: "bg-destructive text-destructive-foreground",
};

function getLocale(lang: string) {
  if (lang === "en") return enUS;
  if (lang === "es") return es;
  return pt;
}

function getDescription(entry: ActivityLog, t: (key: string) => string): string {
  const details = entry.details || {};
  const entityLabel = t(`activity.entity.${entry.entity_type}`);
  const actionLabel = t(`activity.action.${entry.action}`);

  switch (entry.entity_type) {
    case "permit":
      return `${actionLabel} ${entityLabel}: ${details.permit_type || ""}${details.permit_number ? ` #${details.permit_number}` : ""}${details.state ? ` (${details.state})` : ""}`;
    case "truck":
      return `${actionLabel} ${entityLabel}: ${details.plate || ""}${details.make ? ` - ${details.make}` : ""}${details.model ? ` ${details.model}` : ""}`;
    case "client":
      return `${actionLabel} ${entityLabel}: ${details.company_name || ""}`;
    default:
      return `${actionLabel} ${entityLabel}`;
  }
}

export function ActivityTimeline({ clientId }: ActivityTimelineProps) {
  const { data: activities, isLoading } = useActivityLog(clientId);
  const { t, language } = useLanguage();
  const locale = getLocale(language);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activities?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          {t("activity.empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg">{t("activity.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-4">
            {activities.map((entry) => {
              const EntityIcon = entityIcons[entry.entity_type] || FileCheck;
              const ActionIcon = actionIcons[entry.action] || Pencil;
              const color = actionColors[entry.action] || "bg-muted text-muted-foreground";

              return (
                <div key={entry.id} className="flex gap-3 relative">
                  {/* Timeline dot */}
                  <div className={`w-[31px] h-[31px] rounded-full flex items-center justify-center shrink-0 z-10 ${color}`}>
                    <ActionIcon className="w-3.5 h-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug">
                        {getDescription(entry, t)}
                      </p>
                      <Badge variant="outline" className="shrink-0 text-xs font-normal">
                        <EntityIcon className="w-3 h-3 mr-1" />
                        {t(`activity.entity.${entry.entity_type}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
