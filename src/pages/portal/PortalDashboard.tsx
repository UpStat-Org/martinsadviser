import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermits, getExpirationStatus } from "@/hooks/usePermits";
import { useTrucks } from "@/hooks/useTrucks";
import { useClient } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ComplianceDashboard } from "@/components/ComplianceDashboard";
import { PageHeader, SectionHeader } from "@/components/PageHeader";
import { FileCheck, Truck as TruckIcon, FileText, Loader2, Phone, Mail, MapPin, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";

interface PortalOutletContext {
  clientId: string;
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export default function PortalDashboard() {
  const { clientId, setActiveSection } = useOutletContext<PortalOutletContext>();
  const { data: client, isLoading: clientLoading } = useClient(clientId);
  const { data: permits, isLoading: permitsLoading } = usePermits(undefined, clientId);
  const { data: trucks, isLoading: trucksLoading } = useTrucks(undefined, clientId);
  const { t } = useLanguage();
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
  const [viewDocTitle, setViewDocTitle] = useState("");

  const isLoading = clientLoading || permitsLoading || trucksLoading;

  // Sync sidebar's active item with whichever section is in view as the user
  // scrolls. Without this, picking "Permits" once would highlight forever
  // even after the user scrolls back to the overview.
  useEffect(() => {
    if (isLoading) return;
    const ids = ["overview", "permits", "trucks"];
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
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
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
            ? `${permits?.length ?? 0} ${t("portal.yourPermits").toLowerCase()} · ${trucks?.length ?? 0} ${t("portal.yourTrucks").toLowerCase()}`
            : undefined
        }
      />

      {/* Overview */}
      <section id="portal-section-overview" className="space-y-4 scroll-mt-20">
        <SectionHeader
          title={
            <span className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
              {t("portal.overview")}
            </span>
          }
        />
        {client && (
          <Card>
            <CardContent className="flex flex-wrap gap-4 text-sm pt-6">
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {client.phone}
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {client.email}
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {client.address}
                </div>
              )}
              {client.dot && <Badge variant="outline">DOT: {client.dot}</Badge>}
              {client.mc && <Badge variant="outline">MC: {client.mc}</Badge>}
            </CardContent>
          </Card>
        )}

        <ComplianceDashboard permits={permits} />
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
                          {permit.expiration_date ? format(new Date(permit.expiration_date), "dd/MM/yyyy") : "—"}
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
