import { Link, useNavigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import { useState } from "react";
import { ArrowLeft, Building2, CalendarDays, FileCheck, FileText, Hash, History, Pencil, Receipt, Truck } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getExpirationStatus, usePermit } from "@/hooks/usePermits";
import { usePermitDocuments } from "@/hooks/usePermitDocuments";
import { usePermitHistory } from "@/hooks/usePermitHistory";
import { useActivityLog } from "@/hooks/useActivityLog";
import { CommentsSection } from "@/components/CommentsSection";
import { PermitFormDialog } from "@/components/PermitFormDialog";
import { DocumentViewer } from "@/components/DocumentViewer";
import { DocumentLink } from "@/components/DocumentLink";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PermitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const { data: permit, isLoading } = usePermit(id);
  const { data: documents } = usePermitDocuments(id);
  const { data: history } = usePermitHistory(id);
  const { data: activity } = useActivityLog(permit?.client_id, 8);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-md" />;
  if (!permit) return null;

  const status = getExpirationStatus(permit.expiration_date);
  const daysToExpiration = permit.expiration_date
    ? Math.ceil((new Date(permit.expiration_date).getTime() - Date.now()) / 86400000)
    : null;
  const currentDoc = documents?.find((doc) => doc.is_current) || documents?.[0];
  const documentUrl = currentDoc?.document_url || permit.document_url;

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
        title={permit.permit_type}
        description={`${permit.permit_number || t("permitDetail.noNumber")}${permit.state ? ` · ${permit.state}` : ""}`}
        meta={<Badge className={status.color}>{status.label}</Badge>}
        actions={
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4 mr-1.5" />
            {t("common.edit")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusTile label={t("common.status")} value={status.label} tone={daysToExpiration !== null && daysToExpiration <= 30 ? "red" : "emerald"} />
        <StatusTile label={t("forecast.expiringIn").replace("{days}", "").trim() || "Days to expiration"} value={daysToExpiration === null ? "—" : String(daysToExpiration)} tone={daysToExpiration !== null && daysToExpiration <= 30 ? "amber" : "muted"} />
        <StatusTile label={t("permitDetail.dataTitle")} value={String(documents?.length ?? (permit.document_url ? 1 : 0))} tone={documentUrl ? "emerald" : "muted"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("permitDetail.dataTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info label={t("common.client")} value={permit.clients?.company_name || "—"} to={`/clients/${permit.client_id}`} icon={<Building2 className="w-4 h-4" />} />
            <Info label={t("permitDetail.fieldTruck")} value={permit.trucks?.plate || "—"} to={permit.truck_id ? `/trucks/${permit.truck_id}` : undefined} icon={<Truck className="w-4 h-4" />} />
            <Info label={t("permitDetail.fieldNumber")} value={permit.permit_number || "—"} icon={<Hash className="w-4 h-4" />} />
            <Info
              label={t("permitDetail.fieldExpiration")}
              value={permit.expiration_date ? format(new Date(permit.expiration_date), "dd/MM/yyyy") : "—"}
              icon={<CalendarDays className="w-4 h-4" />}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t("common.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link className="block h-10 px-3 rounded-md bg-muted/60 hover:bg-muted text-sm font-semibold leading-10" to={`/clients/${permit.client_id}`}>
              {t("permitDetail.quickClient")}
            </Link>
            {permit.truck_id && (
              <Link className="block h-10 px-3 rounded-md bg-muted/60 hover:bg-muted text-sm font-semibold leading-10" to={`/trucks/${permit.truck_id}`}>
                {t("permitDetail.quickTruck")}
              </Link>
            )}
            {permit.document_url && (
              <button className="block w-full h-10 px-3 rounded-md bg-muted/60 hover:bg-muted text-sm font-semibold leading-10 text-left" onClick={() => setDocOpen(true)}>
                {t("permitDetail.quickDoc")}
              </button>
            )}
            <Link className="block h-10 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold leading-10" to={`/finance?action=new&client=${permit.client_id}`}>
              <Receipt className="inline w-4 h-4 mr-2" />
              {t("permitDetail.quickNewInvoice")}
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t("permitDetail.docsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {documentUrl ? (
              <>
                <button
                  onClick={() => setDocOpen(true)}
                  className="w-full rounded-md border border-border/50 p-3 text-left hover:bg-muted/40"
                >
                  <div className="text-sm font-semibold">{currentDoc?.file_name || `${permit.permit_type} documento`}</div>
                  <div className="text-xs text-muted-foreground">
                    {documents?.length ? `${documents.length} versão(ões)` : "Documento atual"}
                  </div>
                </button>
                {documents?.slice(0, 4).map((doc) => (
                  <DocumentLink
                    key={doc.id}
                    path={doc.document_url}
                    className="flex items-center justify-between rounded-md bg-muted/40 border border-border/50 p-3 hover:bg-muted"
                  >
                    <span className="text-sm font-semibold">v{doc.version}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "dd/MM/yyyy")}</span>
                  </DocumentLink>
                ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("permitDetail.noDocs")}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              {t("permitDetail.historyTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history?.length ? (
              history.slice(0, 5).map((entry) => (
                <div key={entry.id} className="rounded-md bg-muted/40 border border-border/50 p-3">
                  <div className="text-sm font-semibold">{entry.change_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm")}
                  </div>
                  {entry.notes && <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("permitDetail.noHistory")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t("permitDetail.notesTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {permit.notes || t("permitDetail.noNotes")}
            </p>
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

      <CommentsSection entityType="permit" entityId={permit.id} />

      <PermitFormDialog open={editOpen} onOpenChange={setEditOpen} permit={permit} />
      {documentUrl && (
        <DocumentViewer
          open={docOpen}
          onOpenChange={setDocOpen}
          url={documentUrl}
          title={`${permit.permit_type} ${permit.permit_number || ""}`}
          versions={documents}
        />
      )}
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
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
      <div className="text-2xl font-bold mt-1">{value}</div>
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
