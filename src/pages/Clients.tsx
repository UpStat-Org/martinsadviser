import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Loader2, Upload, Users } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { ClientImportDialog } from "@/components/ClientImportDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

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
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !clients?.length ? (
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
                <TableHead className="font-semibold">{t("clients.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
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

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ClientImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
