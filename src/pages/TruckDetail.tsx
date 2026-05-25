import { Link, useNavigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import { useState } from "react";
import { ArrowLeft, Building2, Calendar, FileCheck, Hash, Pencil, Plus, Receipt, Truck as TruckIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTruck } from "@/hooks/useTrucks";
import { DocumentLink } from "@/components/DocumentLink";
import { usePermits } from "@/hooks/usePermits";
import { useInvoices } from "@/hooks/useInvoices";
import { useActivityLog } from "@/hooks/useActivityLog";
import { CommentsSection } from "@/components/CommentsSection";
import { TruckFormDialog } from "@/components/TruckFormDialog";
import { PermitFormDialog } from "@/components/PermitFormDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { MaintenancePanel } from "@/components/MaintenancePanel";

export default function TruckDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [permitOpen, setPermitOpen] = useState(false);
  const { data: truck, isLoading } = useTruck(id);
  const { data: permits } = usePermits(undefined, truck?.client_id);
  const { data: invoices } = useInvoices(truck?.client_id);
  const { data: activity } = useActivityLog(truck?.client_id, 8);

  const truckPermits = permits?.filter((permit) => permit.truck_id === id) ?? [];
  const openInvoices = invoices?.filter((invoice) => invoice.status !== "paid").length ?? 0;
  const expiringPermits = truckPermits.filter((permit) => {
    if (!permit.expiration_date) return false;
    const diff = Math.ceil((new Date(permit.expiration_date).getTime() - Date.now()) / 86400000);
    return diff <= 30;
  }).length;
  const relatedDocs = truckPermits.filter((permit) => permit.document_url);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-md" />;
  if (!truck) return null;

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("common.back")}
      </button>

      <PageHeader
        title={truck.plate}
        description={[truck.year, truck.make, truck.model].filter(Boolean).join(" ") || "—"}
        meta={
          <Badge
            variant="outline"
            className={
              truck.status === "active"
                ? "bg-success/10 text-success border-success/30"
                : "bg-muted text-muted-foreground border-border"
            }
          >
            {truck.status === "active" ? t("common.active") : t("common.inactive")}
          </Badge>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4 mr-1.5" />
            {t("common.edit")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusTile label="Permits" value={truckPermits.length} tone="emerald" />
        <StatusTile label="Vencendo/atrasados" value={expiringPermits} tone={expiringPermits ? "red" : "muted"} />
        <StatusTile label="Invoices abertas" value={openInvoices} tone={openInvoices ? "amber" : "muted"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("truckDetail.dataTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info label={t("common.client")} value={(truck as typeof truck & { clients?: { company_name: string } | null }).clients?.company_name || "—"} to={`/clients/${truck.client_id}`} icon={<Building2 className="w-4 h-4" />} />
            <Info label="VIN" value={truck.vin || "—"} icon={<Hash className="w-4 h-4" />} />
            <Info label={t("trucks.year")} value={truck.year ? String(truck.year) : "—"} icon={<Calendar className="w-4 h-4" />} />
            <Info label={t("nav.permits")} value={String(truckPermits.length)} icon={<FileCheck className="w-4 h-4" />} />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t("common.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button className="block w-full h-10 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold leading-10 text-left" onClick={() => setPermitOpen(true)}>
              <Plus className="inline w-4 h-4 mr-2" />
              {t("truckDetail.quickNewPermit")}
            </button>
            <Link className="block h-10 px-3 rounded-md bg-muted/60 hover:bg-muted text-sm font-semibold leading-10" to={`/clients/${truck.client_id}`}>
              {t("truckDetail.quickClient")}
            </Link>
            <Link className="block h-10 px-3 rounded-md bg-muted/60 hover:bg-muted text-sm font-semibold leading-10" to={`/permits?truck=${truck.id}`}>
              {t("truckDetail.quickViewPermits")}
            </Link>
            <Link className="block h-10 px-3 rounded-md bg-muted/60 hover:bg-muted text-sm font-semibold leading-10" to={`/finance?action=new&client=${truck.client_id}`}>
              <Receipt className="inline w-4 h-4 mr-2" />
              {t("truckDetail.quickNewInvoice")}
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">{t("truckDetail.permitsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {truckPermits.length ? (
            truckPermits.map((permit) => (
              <Link
                key={permit.id}
                to={`/permits/${permit.id}`}
                className="flex items-center justify-between rounded-md border border-border/50 p-3 hover:bg-muted/40"
              >
                <span className="text-sm font-semibold">{permit.permit_type}</span>
                <span className="text-xs text-muted-foreground">{permit.expiration_date || "—"}</span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("truckDetail.noPermits")}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t("truckDetail.documentsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {relatedDocs.length ? (
              relatedDocs.map((permit) => (
                <DocumentLink
                  key={permit.id}
                  path={permit.document_url}
                  className="flex items-center justify-between rounded-md border border-border/50 p-3 hover:bg-muted/40"
                >
                  <span className="text-sm font-semibold">{permit.permit_type}</span>
                  <span className="text-xs text-muted-foreground">{t("common.openDocument")}</span>
                </DocumentLink>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("truckDetail.noDocuments")}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t("common.recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activity?.length ? (
              activity.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-md bg-muted/40 border border-border/50 p-3">
                  <div className="text-sm font-semibold">{item.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("common.noActivity")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <MaintenancePanel truckId={truck.id} />

      <CommentsSection entityType="truck" entityId={truck.id} />

      <TruckFormDialog open={editOpen} onOpenChange={setEditOpen} truck={truck} />
      <PermitFormDialog
        open={permitOpen}
        onOpenChange={setPermitOpen}
        defaultClientId={truck.client_id}
        defaultTruckId={truck.id}
      />
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "red" | "muted";
}) {
  const toneClass = {
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    red: "bg-red-500/10 text-red-600 border-red-500/20",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <div className={`rounded-md border p-4 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Info({
  label,
  value,
  icon,
  to,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  to?: string;
}) {
  const content = (
    <div className="rounded-md bg-muted/40 border border-border/50 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {icon}
        {label}
      </div>
      <div className="font-semibold">{value}</div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}
