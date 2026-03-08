import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AuditPage() {
  const { t } = useLanguage();
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles_map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, email, full_name");
      return new Map((data || []).map((p) => [p.id, p]));
    },
  });

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      if (entityFilter !== "all" && log.entity_type !== entityFilter) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (dateFrom && log.created_at < dateFrom) return false;
      if (dateTo && log.created_at > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [logs, entityFilter, actionFilter, dateFrom, dateTo]);

  const entityTypes = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map((l) => l.entity_type))];
  }, [logs]);

  const actionColors: Record<string, string> = {
    created: "bg-success text-success-foreground",
    updated: "bg-warning text-warning-foreground",
    deleted: "bg-destructive text-destructive-foreground",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <ScrollText className="w-8 h-8" />
          {t("audit.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("audit.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.allEntities")}</SelectItem>
            {entityTypes.map((e) => (
              <SelectItem key={e} value={e}>{t(`activity.entity.${e}`) || e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.allActions")}</SelectItem>
            <SelectItem value="created">{t("activity.action.created")}</SelectItem>
            <SelectItem value="updated">{t("activity.action.updated")}</SelectItem>
            <SelectItem value="deleted">{t("activity.action.deleted")}</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" placeholder={t("reports.from")} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" placeholder={t("reports.to")} />
        <span className="text-sm text-muted-foreground self-center">{filtered.length} {t("reports.results")}</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">{t("audit.empty")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("audit.date")}</TableHead>
                  <TableHead>{t("audit.user")}</TableHead>
                  <TableHead>{t("audit.entity")}</TableHead>
                  <TableHead>{t("audit.action")}</TableHead>
                  <TableHead>{t("audit.details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => {
                  const profile = profiles?.get(log.user_id);
                  const details = log.details as Record<string, any> | null;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {profile?.full_name || profile?.email || log.user_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t(`activity.entity.${log.entity_type}`) || log.entity_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={actionColors[log.action] || "bg-muted text-muted-foreground"}>
                          {t(`activity.action.${log.action}`) || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">
                        {details ? Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(" | ") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
