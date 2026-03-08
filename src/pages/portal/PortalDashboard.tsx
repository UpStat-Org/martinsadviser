import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermits, getExpirationStatus } from "@/hooks/usePermits";
import { useTrucks } from "@/hooks/useTrucks";
import { useClient } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ComplianceDashboard } from "@/components/ComplianceDashboard";
import { FileCheck, Truck as TruckIcon, FileText, Loader2, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";

export default function PortalDashboard() {
  const { clientId } = useOutletContext<{ clientId: string }>();
  const { data: client, isLoading: clientLoading } = useClient(clientId);
  const { data: permits, isLoading: permitsLoading } = usePermits(undefined, clientId);
  const { data: trucks, isLoading: trucksLoading } = useTrucks(undefined, clientId);
  const { t } = useLanguage();
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
  const [viewDocTitle, setViewDocTitle] = useState("");

  const isLoading = clientLoading || permitsLoading || trucksLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Info */}
      {client && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">{t("portal.welcome")}, {client.company_name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            {client.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{client.phone}</div>}
            {client.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />{client.email}</div>}
            {client.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{client.address}</div>}
            {client.dot && <Badge variant="outline">DOT: {client.dot}</Badge>}
            {client.mc && <Badge variant="outline">MC: {client.mc}</Badge>}
          </CardContent>
        </Card>
      )}

      {/* Compliance */}
      <ComplianceDashboard permits={permits} />

      {/* Tabs */}
      <Tabs defaultValue="permits">
        <TabsList>
          <TabsTrigger value="permits" className="gap-2"><FileCheck className="w-4 h-4" />{t("portal.yourPermits")} ({permits?.length || 0})</TabsTrigger>
          <TabsTrigger value="trucks" className="gap-2"><TruckIcon className="w-4 h-4" />{t("portal.yourTrucks")} ({trucks?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="permits" className="mt-4">
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
                          <TableCell>{(permit as any).trucks?.plate || "—"}</TableCell>
                          <TableCell>{permit.state || "—"}</TableCell>
                          <TableCell>{permit.expiration_date ? format(new Date(permit.expiration_date), "dd/MM/yyyy") : "—"}</TableCell>
                          <TableCell><Badge className={expStatus.color}>{expStatus.label}</Badge></TableCell>
                          <TableCell>
                            {permit.document_url ? (
                              <Button variant="ghost" size="icon" onClick={() => { setViewDocUrl(permit.document_url!); setViewDocTitle(`${permit.permit_type} - ${permit.permit_number || ""}`); }}>
                                <FileText className="w-4 h-4 text-primary" />
                              </Button>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trucks" className="mt-4">
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
                      <TableHead>VIN</TableHead>
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
                          <Badge className={truck.status === "active" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
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
        </TabsContent>
      </Tabs>

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
