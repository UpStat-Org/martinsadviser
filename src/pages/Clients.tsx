import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Loader2, Upload } from "lucide-react";
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
    active: { label: t("common.active"), className: "bg-success text-success-foreground" },
    inactive: { label: t("common.inactive"), className: "bg-muted text-muted-foreground" },
    pending: { label: t("common.pending"), className: "bg-warning text-warning-foreground" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t("clients.title")}</h1>
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
            className="pl-10"
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
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
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
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("clients.company")}</TableHead>
                <TableHead>DOT</TableHead>
                <TableHead>MC</TableHead>
                <TableHead>{t("clients.phone")}</TableHead>
                <TableHead>{t("clients.services")}</TableHead>
                <TableHead>{t("clients.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const status = statusMap[client.status] || statusMap.active;
                const activeServices = serviceLabels.filter((s) => client[s.key]);
                return (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <TableCell className="font-medium">{client.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">{client.dot || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{client.mc || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{client.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {activeServices.map((s) => (
                          <Badge key={s.key} variant="secondary" className="text-xs">{s.label}</Badge>
                        ))}
                        {!activeServices.length && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={status.className}>{status.label}</Badge>
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
