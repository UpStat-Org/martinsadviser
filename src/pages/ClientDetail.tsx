import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClient, useDeleteClient } from "@/hooks/useClients";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Loader2, Phone, Mail, MapPin } from "lucide-react";

const statusMap: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-success text-success-foreground" },
  inactive: { label: "Inativo", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pendente", className: "bg-warning text-warning-foreground" },
};

const serviceLabels = [
  { key: "service_ifta", label: "IFTA" },
  { key: "service_ct", label: "CT" },
  { key: "service_ny", label: "NY" },
  { key: "service_kyu", label: "KYU" },
  { key: "service_nm", label: "NM" },
  { key: "service_automatic", label: "Automatic" },
] as const;

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);
  const deleteClient = useDeleteClient();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clients")}>
          Voltar
        </Button>
      </div>
    );
  }

  const status = statusMap[client.status] || statusMap.active;
  const activeServices = serviceLabels.filter((s) => client[s.key]);

  const handleDelete = async () => {
    await deleteClient.mutateAsync(client.id);
    navigate("/clients");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-foreground">
              {client.company_name}
            </h1>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="w-4 h-4 mr-2" />
          Editar
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita. O cliente e todos os dados associados serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">EIN</p>
                <p className="font-medium">{client.ein || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">DOT #</p>
                <p className="font-medium">{client.dot || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">MC #</p>
                <p className="font-medium">{client.mc || "—"}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{client.address}</span>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {serviceLabels.map((s) => (
                <Badge
                  key={s.key}
                  variant={client[s.key] ? "default" : "outline"}
                  className={!client[s.key] ? "opacity-40" : ""}
                >
                  {s.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
      />
    </div>
  );
}
