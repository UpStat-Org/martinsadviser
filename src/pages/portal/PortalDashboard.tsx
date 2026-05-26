import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePermits, getExpirationStatus, type Permit } from "@/hooks/usePermits";
import { useTrucks } from "@/hooks/useTrucks";
import { useClient } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ComplianceDashboard } from "@/components/ComplianceDashboard";
import { PermitCoverageMap } from "@/components/PermitCoverageMap";
import { PageHeader, SectionHeader } from "@/components/PageHeader";
import {
  FileCheck, Truck as TruckIcon, FileText, Loader2, Phone, Mail, MapPin,
  LayoutDashboard, FolderOpen, AlertTriangle, Clock, ShieldCheck,
  Map as MapIconLucide, CalendarClock, FileWarning,
} from "lucide-react";
import { format } from "date-fns";
import { pt, enUS, es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const dateLocales = { pt, en: enUS, es };

interface PortalOutletContext {
  clientId: string;
  activeSection: string;
  setActiveSection: (section: string) => void;
}

function KpiTile({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  loading,
}: {
  label: string;
  value: number | string;
  icon: typeof FileCheck;
  tone?: "neutral" | "warning" | "danger" | "success";
  loading?: boolean;
}) {
  const toneBar =
    tone === "danger" ? "bg-destructive" :
    tone === "warning" ? "bg-warning" :
    tone === "success" ? "bg-success" :
    null;
  return (
    <div className="relative rounded-md border border-border bg-card p-3.5 overflow-hidden">
      {toneBar && (
        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", toneBar)} />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <Icon className="w-4 h-4 text-muted-foreground/70" />
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16 mt-2" />
      ) : (
        <div className="text-2xl font-semibold tracking-tight tabular mt-1.5">{value}</div>
      )}
    </div>
  );
}

export default function PortalDashboard() {
  const { clientId, setActiveSection } = useOutletContext<PortalOutletContext>();
  const { data: client, isLoading: clientLoading } = useClient(clientId);
  const { data: permits, isLoading: permitsLoading } = usePermits(undefined, clientId);
  const { data: trucks, isLoading: trucksLoading } = useTrucks(undefined, clientId);
  const { t, language } = useLanguage();
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
  const [viewDocTitle, setViewDocTitle] = useState("");

  const isLoading = clientLoading || permitsLoading || trucksLoading;

  const metrics = useMemo(() => {
    if (!permits) return { expired: 0, in30: 0, in60: 0, valid: 0, total: 0, withDoc: 0 };
    const now = new Date();
    let expired = 0, in30 = 0, in60 = 0, valid = 0, withDoc = 0;
    for (const p of permits) {
      if (p.document_url) withDoc++;
      if (!p.expiration_date) { valid++; continue; }
      const diff = Math.ceil((new Date(p.expiration_date).getTime() - now.getTime()) / 86400000);
      if (diff < 0) expired++;
      else if (diff <= 30) in30++;
      else if (diff <= 60) in60++;
      else valid++;
    }
    return { expired, in30, in60, valid, total: permits.length, withDoc };
  }, [permits]);

  const activeTrucks = useMemo(
    () => trucks?.filter((tr) => tr.status === "active").length ?? 0,
    [trucks],
  );

  const upcomingPermits = useMemo(() => {
    if (!permits) return [] as Permit[];
    const now = new Date();
    return permits
      .filter((p) => p.expiration_date)
      .map((p) => {
        const diff = Math.ceil(
          (new Date(p.expiration_date!).getTime() - now.getTime()) / 86400000,
        );
        return { permit: p, diff };
      })
      .filter((x) => x.diff <= 60)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 8)
      .map((x) => x.permit);
  }, [permits]);

  const documentItems = useMemo(() => {
    if (!permits) return [];
    return permits
      .filter((p) => p.document_url)
      .map((p) => ({
        id: p.id,
        title: p.permit_type,
        subtitle: [p.permit_number, p.state].filter(Boolean).join(" · ") || "—",
        url: p.document_url!,
        expirationDate: p.expiration_date,
      }));
  }, [permits]);

  useEffect(() => {
    if (isLoading) return;
    const ids = ["overview", "coverage", "permits", "trucks", "documents"];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = visible.target.id.replace("portal-section-", "");
          setActiveSection(id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(`portal-section-${id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isLoading, setActiveSection]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={client ? `${t("portal.welcome")}, ${client.company_name}` : t("portal.login")}
        description={
          client
            ? `${metrics.total} ${t("portal.yourPermits").toLowerCase()} · ${trucks?.length ?? 0} ${t("portal.yourTrucks").toLowerCase()}`
            : undefined
        }
      />

      {/* Overview — KPIs + client info + compliance */}
      <section id="portal-section-overview" className="space-y-4 scroll-mt-20">
        <SectionHeader
          title={
            <span className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
              {t("portal.overview")}
            </span>
          }
        />

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
          <KpiTile
            label={t("dashboard.activePermits")}
            value={metrics.valid + metrics.in60}
            icon={FileCheck}
          />
          <KpiTile
            label={t("dashboard.expiring30d")}
            value={metrics.in30}
            icon={AlertTriangle}
            tone={metrics.in30 > 0 ? "warning" : "neutral"}
          />
          <KpiTile
            label={t("dashboard.expired")}
            value={metrics.expired}
            icon={Clock}
            tone={metrics.expired > 0 ? "danger" : "neutral"}
          />
          <KpiTile
            label={t("portal.activeTrucks")}
            value={activeTrucks}
            icon={TruckIcon}
          />
          <KpiTile
            label={t("portal.documentsAvailable")}
            value={metrics.withDoc}
            icon={FolderOpen}
          />
          <KpiTile
            label={t("compliance.score")}
            value={
              metrics.total === 0
                ? "—"
                : `${Math.round(((metrics.valid + metrics.in60) / metrics.total) * 100)}%`
            }
            icon={ShieldCheck}
            tone={
              metrics.total === 0
                ? "neutral"
                : metrics.expired > 0
                  ? "danger"
                  : metrics.in30 > 0
                    ? "warning"
                    : "success"
            }
          />
        </div>

        {/* Client info + Compliance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {client && (
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  {t("portal.companyInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{client.address}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {client.dot && <Badge variant="outline">DOT: {client.dot}</Badge>}
                  {client.mc && <Badge variant="outline">MC: {client.mc}</Badge>}
                  {client.ein && <Badge variant="outline">EIN: {client.ein}</Badge>}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="lg:col-span-2">
            <ComplianceDashboard permits={permits} />
          </div>
        </div>

        {/* Upcoming expirations */}
        <Card>
          <CardHeader className="pb-3">
            <SectionHeader
              title={
                <span className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-muted-foreground" />
                  {t("portal.upcomingExpirations")}
                </span>
              }
              description={t("portal.upcomingExpirationsDesc")}
              actions={
                upcomingPermits.length > 0 ? (
                  <Badge
                    className={
                      metrics.in30 > 0
                        ? "bg-warning text-warning-foreground"
                        : "bg-success text-success-foreground"
                    }
                  >
                    {upcomingPermits.length}
                  </Badge>
                ) : null
              }
            />
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingPermits.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <ShieldCheck className="w-5 h-5 mx-auto mb-2 text-success" />
                {t("portal.allClear")}
              </div>
            ) : (
              <ul className="divide-y divide-border -mx-2">
                {upcomingPermits.map((p) => {
                  const status = getExpirationStatus(p.expiration_date);
                  const days = p.expiration_date
                    ? Math.ceil(
                        (new Date(p.expiration_date).getTime() - Date.now()) / 86400000,
                      )
                    : null;
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 px-2 py-2.5"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center shrink-0">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {p.permit_type}
                            {p.permit_number && (
                              <span className="ml-2 text-xs font-mono text-muted-foreground">
                                {p.permit_number}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[p.state, p.trucks?.plate].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={status.color}>{status.label}</Badge>
                        <span className="text-[11px] text-muted-foreground tabular w-20 text-right">
                          {p.expiration_date
                            ? format(new Date(p.expiration_date), "dd MMM yyyy", {
                                locale: dateLocales[language],
                              })
                            : "—"}
                        </span>
                        {days !== null && (
                          <span
                            className={cn(
                              "text-[11px] font-semibold tabular w-12 text-right",
                              days < 0
                                ? "text-destructive"
                                : days <= 30
                                  ? "text-warning"
                                  : "text-muted-foreground",
                            )}
                          >
                            {days < 0 ? `${days}d` : `+${days}d`}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Coverage map */}
      <section id="portal-section-coverage" className="space-y-4 scroll-mt-20">
        <SectionHeader
          title={
            <span className="flex items-center gap-2">
              <MapIconLucide className="w-4 h-4 text-muted-foreground" />
              {t("portal.coverage")}
            </span>
          }
          description={t("portal.coverageDesc")}
        />
        <Card>
          <CardContent className="pt-6">
            <PermitCoverageMap permits={permits} />
          </CardContent>
        </Card>
      </section>

      {/* Permits */}
      <section id="portal-section-permits" className="space-y-4 scroll-mt-20">
        <SectionHeader
          title={
            <span className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-muted-foreground" />
              {t("portal.yourPermits")}
            </span>
          }
          actions={
            <Badge variant="outline" className="h-5 text-[11px]">
              {permits?.length ?? 0}
            </Badge>
          }
        />
        <Card>
          <CardContent className="p-0">
            {!permits?.length ? (
              <div className="p-8 text-center text-muted-foreground">{t("portal.noPermits")}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.type")}</TableHead>
                    <TableHead>{t("common.number")}</TableHead>
                    <TableHead>{t("common.truck")}</TableHead>
                    <TableHead>{t("common.state")}</TableHead>
                    <TableHead>{t("common.expiration")}</TableHead>
                    <TableHead>{t("clients.status")}</TableHead>
                    <TableHead>{t("common.doc")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permits.map((permit) => {
                    const expStatus = getExpirationStatus(permit.expiration_date);
                    return (
                      <TableRow key={permit.id}>
                        <TableCell className="font-medium">{permit.permit_type}</TableCell>
                        <TableCell className="font-mono text-xs">{permit.permit_number || "—"}</TableCell>
                        <TableCell>{permit.trucks?.plate || "—"}</TableCell>
                        <TableCell>{permit.state || "—"}</TableCell>
                        <TableCell>
                          {permit.expiration_date
                            ? format(new Date(permit.expiration_date), "dd MMM yyyy", {
                                locale: dateLocales[language],
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={expStatus.color}>{expStatus.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {permit.document_url ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setViewDocUrl(permit.document_url!);
                                setViewDocTitle(`${permit.permit_type} - ${permit.permit_number || ""}`);
                              }}
                            >
                              <FileText className="w-4 h-4 text-primary" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Trucks */}
      <section id="portal-section-trucks" className="space-y-4 scroll-mt-20">
        <SectionHeader
          title={
            <span className="flex items-center gap-2">
              <TruckIcon className="w-4 h-4 text-muted-foreground" />
              {t("portal.yourTrucks")}
            </span>
          }
          actions={
            <Badge variant="outline" className="h-5 text-[11px]">
              {trucks?.length ?? 0}
            </Badge>
          }
        />
        <Card>
          <CardContent className="p-0">
            {!trucks?.length ? (
              <div className="p-8 text-center text-muted-foreground">{t("portal.noTrucks")}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("trucks.plate")}</TableHead>
                    <TableHead>{t("trucks.makeModel")}</TableHead>
                    <TableHead>{t("trucks.year")}</TableHead>
                    <TableHead>{t("trucks.vin")}</TableHead>
                    <TableHead>{t("clients.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trucks.map((truck) => (
                    <TableRow key={truck.id}>
                      <TableCell className="font-medium">{truck.plate}</TableCell>
                      <TableCell>{[truck.make, truck.model].filter(Boolean).join(" ") || "—"}</TableCell>
                      <TableCell>{truck.year || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{truck.vin || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            truck.status === "active"
                              ? "bg-success text-success-foreground"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {truck.status === "active" ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Documents */}
      <section id="portal-section-documents" className="space-y-4 scroll-mt-20">
        <SectionHeader
          title={
            <span className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              {t("portal.yourDocuments")}
            </span>
          }
          description={t("portal.documentsDesc")}
          actions={
            <Badge variant="outline" className="h-5 text-[11px]">
              {documentItems.length}
            </Badge>
          }
        />
        {documentItems.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <FileWarning className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              {t("portal.noDocuments")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {documentItems.map((doc) => {
              const status = getExpirationStatus(doc.expirationDate);
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setViewDocUrl(doc.url);
                    setViewDocTitle(doc.title);
                  }}
                  className="text-left rounded-md border border-border bg-card hover:bg-muted/60 transition-colors p-4 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{doc.title}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                        {doc.subtitle}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Badge className={cn("text-[10px] py-0", status.color)}>
                          {status.label}
                        </Badge>
                        {doc.expirationDate && (
                          <span className="text-[10px] text-muted-foreground tabular">
                            {format(new Date(doc.expirationDate), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {viewDocUrl && (
        <DocumentViewer
          open={!!viewDocUrl}
          onOpenChange={(v) => { if (!v) setViewDocUrl(null); }}
          url={viewDocUrl}
          title={viewDocTitle}
        />
      )}
    </div>
  );
}
