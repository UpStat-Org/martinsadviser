import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Pencil,
  IdCard,
  Stethoscope,
  FileCheck2,
  Building2,
  Phone,
  Mail,
} from "lucide-react";
import { useDriver, type Driver } from "@/hooks/useDrivers";
import { useClient } from "@/hooks/useClients";
import { useDriverDocuments } from "@/hooks/useDqf";
import { DriverFormDialog } from "@/components/DriverFormDialog";
import { DqfChecklist } from "@/components/DqfChecklist";
import { HosViolationsPanel } from "@/components/HosViolationsPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { driverCompliance, type ExpiryInfo } from "@/lib/dqf";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<Driver["status"], string> = {
  active: "bg-success/10 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
  terminated: "bg-destructive/10 text-destructive border-destructive/30",
};

function SummaryTile({
  icon: Icon,
  label,
  info,
}: {
  icon: typeof IdCard;
  label: string;
  info: ExpiryInfo;
}) {
  const { t } = useLanguage();
  const tone =
    info.state === "expired"
      ? "border-destructive/30 bg-destructive/5"
      : info.state === "expiring"
      ? "border-warning/30 bg-warning/5"
      : info.state === "missing"
      ? "border-border bg-muted/30"
      : "border-success/30 bg-success/5";
  const iconTone =
    info.state === "expired"
      ? "text-destructive"
      : info.state === "expiring"
      ? "text-warning"
      : info.state === "missing"
      ? "text-muted-foreground"
      : "text-success";
  return (
    <div className={cn("rounded-md border p-3 flex items-center gap-3", tone)}>
      <div className={cn("w-9 h-9 rounded-md bg-card border border-border/60 flex items-center justify-center", iconTone)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="text-sm font-semibold truncate">
          {info.state === "missing"
            ? t("driverDetail.notSet")
            : format(new Date(info.date!), "MMM dd, yyyy")}
        </div>
        {info.state === "expired" && (
          <div className="text-[11px] font-bold text-destructive">{t("driversPage.overdue")}</div>
        )}
        {info.state === "expiring" && (
          <div className="text-[11px] font-bold text-warning">
            {t("driversPage.inDays").replace("{days}", String(info.daysUntil))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: driver, isLoading } = useDriver(id);
  const { data: client } = useClient(driver?.client_id);
  const { data: docs } = useDriverDocuments(id);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground mb-4">{t("driverDetail.notFound")}</p>
        <Button variant="outline" onClick={() => navigate("/drivers")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t("driverDetail.back")}
        </Button>
      </div>
    );
  }

  const compliance = driverCompliance(driver, docs);

  return (
    <div className="space-y-6">
      <Link to="/drivers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t("driverDetail.back")}
      </Link>

      {/* Profile header */}
      <Card className="border-border/60 relative overflow-hidden">
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1",
            compliance.level === "critical"
              ? "bg-gradient-to-r from-destructive to-destructive/30"
              : compliance.level === "attention"
              ? "bg-gradient-to-r from-warning to-warning/30"
              : "bg-gradient-to-r from-success to-success/30",
          )}
        />
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-12 h-12 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-primary">{driver.full_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-semibold tracking-tight">{driver.full_name}</h1>
                  <Badge variant="outline" className={STATUS_BADGE[driver.status]}>
                    {t(`drivers.status.${driver.status}`)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  {client && (
                    <Link to={`/clients/${client.id}`} className="inline-flex items-center gap-1 hover:text-foreground">
                      <Building2 className="w-3.5 h-3.5" />
                      {client.company_name}
                    </Link>
                  )}
                  {driver.cdl_number && (
                    <span className="inline-flex items-center gap-1 font-mono text-xs">
                      <IdCard className="w-3.5 h-3.5" />
                      {driver.cdl_number}
                      {driver.cdl_state ? ` · ${driver.cdl_state}` : ""}
                      {driver.cdl_class ? ` · Class ${driver.cdl_class}` : ""}
                    </span>
                  )}
                  {driver.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{driver.phone}</span>}
                  {driver.email && <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{driver.email}</span>}
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5 flex-shrink-0">
              <Pencil className="w-3.5 h-3.5" />
              {t("driverDetail.edit")}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <SummaryTile icon={IdCard} label={t("driverDetail.cdlExpiry")} info={compliance.cdl} />
            <SummaryTile icon={Stethoscope} label={t("driverDetail.medicalExpiry")} info={compliance.medical} />
            <div
              className={cn(
                "rounded-md border p-3 flex items-center gap-3",
                compliance.dqf.complete ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5",
              )}
            >
              <div className={cn("w-9 h-9 rounded-md bg-card border border-border/60 flex items-center justify-center", compliance.dqf.complete ? "text-success" : "text-warning")}>
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{t("driverDetail.dqfReadiness")}</div>
                <div className="text-sm font-semibold">{compliance.dqf.percent}%</div>
                <div className="text-[11px] text-muted-foreground">
                  {compliance.dqf.current}/{compliance.dqf.required} {t("driverDetail.docsReady")}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DQF + HOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <DqfChecklist driverId={driver.id} driverName={driver.full_name} />
        <HosViolationsPanel driverId={driver.id} />
      </div>

      {driver.notes && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t("driverDetail.notes")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">{driver.notes}</CardContent>
        </Card>
      )}

      <DriverFormDialog open={editOpen} onOpenChange={setEditOpen} clientId={driver.client_id} driver={driver} />
    </div>
  );
}
