import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Loader2, Upload, Users, FileCheck, Truck as TruckIcon, ShieldAlert, ShieldCheck as ShieldOk } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { ClientImportDialog } from "@/components/ClientImportDialog";
import { PaginationBar } from "@/components/PaginationBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { usePermits } from "@/hooks/usePermits";
import { useTrucks } from "@/hooks/useTrucks";

const serviceLabels = [
  { key: "service_ifta", label: "IFTA" },
  { key: "service_ct", label: "CT" },
  { key: "service_ny", label: "NY" },
  { key: "service_kyu", label: "KYU" },
  { key: "service_nm", label: "NM" },
  { key: "service_automatic", label: "Auto" },
] as const;

export default function Clients() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { data: clients, isLoading } = useClients(search);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { role } = useAuth();
  const isViewer = role === "viewer";

  const [serviceFilter, setServiceFilter] = useState<string | null>(null);
  const { data: allPermits } = usePermits();
  const { data: allTrucks } = useTrucks();

  const permitCountByClient = useMemo(() => {
    const map: Record<string, number> = {};
    allPermits?.forEach((p) => { map[p.client_id] = (map[p.client_id] || 0) + 1; });
    return map;
  }, [allPermits]);

  const truckCountByClient = useMemo(() => {
    const map: Record<string, number> = {};
    allTrucks?.forEach((t) => { map[t.client_id] = (map[t.client_id] || 0) + 1; });
    return map;
  }, [allTrucks]);

  const riskByClient = useMemo(() => {
    const map: Record<string, "ok" | "warning" | "danger"> = {};
    if (!allPermits) return map;
    const now = new Date();
    allPermits.forEach((p) => {
      if (!p.expiration_date) return;
      const diff = Math.ceil((new Date(p.expiration_date).getTime() - now.getTime()) / 86400000);
      const current = map[p.client_id] || "ok";
      if (diff < 0 || diff <= 30) map[p.client_id] = "danger";
      else if (diff <= 90 && current !== "danger") map[p.client_id] = "warning";
      else if (!map[p.client_id]) map[p.client_id] = "ok";
    });
    return map;
  }, [allPermits]);

  const filteredClients = useMemo(() => {
    if (!clients || !serviceFilter) return clients;
    return clients.filter((c) => (c as any)[serviceFilter] === true);
  }, [clients, serviceFilter]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const totalPages = Math.ceil((filteredClients?.length || 0) / PAGE_SIZE);
  const paginatedClients = useMemo(() => {
    if (!filteredClients) return [];
    const start = (page - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, page]);

  useEffect(() => { setPage(1); }, [search, serviceFilter]);

  const statusMap: Record<string, { label: string; className: string }> = {
    active: { label: t("common.active"), className: "bg-success/10 text-success border-success/20" },
    inactive: { label: t("common.inactive"), className: "bg-muted text-muted-foreground" },
    pending: { label: t("common.pending"), className: "bg-warning/10 text-warning border-warning/20" },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{t("clients.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("clients.subtitle")}</p>
        </div>
        {!isViewer && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />{t("import.title")}
            </Button>
            <Button onClick={() => navigate("/clients/onboarding")}>
              <Plus className="w-4 h-4 mr-2" />{t("clients.new")}
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("clients.search")}
            className="pl-10 bg-muted/30 border-border/60 focus:bg-background transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {serviceLabels.map((s) => (
            <Badge
              key={s.key}
              variant={serviceFilter === s.key ? "default" : "outline"}
              className={`cursor-pointer transition-all text-xs ${serviceFilter === s.key ? "" : "hover:bg-muted"}`}
              onClick={() => setServiceFilter(serviceFilter === s.key ? null : s.key)}
            >
              {s.label}
            </Badge>
          ))}
          {serviceFilter && (
            <Badge variant="outline" className="cursor-pointer hover:bg-destructive/10 text-xs" onClick={() => setServiceFilter(null)}>
              Limpar
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !filteredClients?.length ? (
        <Card className="shadow-soft">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-lg">
              {search ? t("clients.noResults") : t("clients.empty")}
            </p>
            {!search && (
              <Button variant="outline" className="mt-4" onClick={() => navigate("/clients/onboarding")}>
                <Plus className="w-4 h-4 mr-2" />
                {t("clients.registerFirst")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">{t("clients.company")}</TableHead>
                <TableHead className="font-semibold">DOT</TableHead>
                <TableHead className="font-semibold">MC</TableHead>
                <TableHead className="font-semibold">{t("clients.phone")}</TableHead>
                <TableHead className="font-semibold">{t("clients.services")}</TableHead>
                <TableHead className="font-semibold text-center">Permits</TableHead>
                <TableHead className="font-semibold text-center">Trucks</TableHead>
                <TableHead className="font-semibold">Risco</TableHead>
                <TableHead className="font-semibold">{t("clients.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client) => {
                const status = statusMap[client.status] || statusMap.active;
                const activeServices = serviceLabels.filter((s) => client[s.key]);
                return (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <TableCell className="font-medium">{client.company_name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{client.dot || "—"}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{client.mc || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{client.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {activeServices.map((s) => (
                          <Badge key={s.key} variant="secondary" className="text-xs font-medium">{s.label}</Badge>
                        ))}
                        {!activeServices.length && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-mono">{permitCountByClient[client.id] || 0}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-mono">{truckCountByClient[client.id] || 0}</span>
                    </TableCell>
                    <TableCell>
                      {riskByClient[client.id] === "danger" ? (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1" variant="outline">
                          <ShieldAlert className="w-3 h-3" />Urgente
                        </Badge>
                      ) : riskByClient[client.id] === "warning" ? (
                        <Badge className="bg-warning/10 text-warning border-warning/20 gap-1" variant="outline">
                          <ShieldAlert className="w-3 h-3" />Atenção
                        </Badge>
                      ) : permitCountByClient[client.id] > 0 ? (
                        <Badge className="bg-success/10 text-success border-success/20 gap-1" variant="outline">
                          <ShieldOk className="w-3 h-3" />OK
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.className}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ClientImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
