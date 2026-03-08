import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClient, useDeleteClient } from "@/hooks/useClients";
import { useTrucks, useDeleteTruck, type Truck } from "@/hooks/useTrucks";
import { usePermits, useDeletePermit, getExpirationStatus, type Permit } from "@/hooks/usePermits";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { TruckFormDialog } from "@/components/TruckFormDialog";
import { PermitFormDialog } from "@/components/PermitFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Loader2, Phone, Mail, MapPin, Plus, Truck as TruckIcon, FileCheck } from "lucide-react";
import { format } from "date-fns";

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
  const { data: trucks } = useTrucks(undefined, id);
  const { data: permits } = usePermits(undefined, id);
  const deleteClient = useDeleteClient();
  const deleteTruck = useDeleteTruck();
  const deletePermit = useDeletePermit();

  const [editOpen, setEditOpen] = useState(false);
  const [truckDialogOpen, setTruckDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [permitDialogOpen, setPermitDialogOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);

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

  const handleDelete = async () => {
    await deleteClient.mutateAsync(client.id);
    navigate("/clients");
  };

  const handleEditTruck = (truck: Truck) => {
    setEditingTruck(truck);
    setTruckDialogOpen(true);
  };

  const handleNewTruck = () => {
    setEditingTruck(null);
    setTruckDialogOpen(true);
  };

  const handleEditPermit = (permit: Permit) => {
    setEditingPermit(permit);
    setPermitDialogOpen(true);
  };

  const handleNewPermit = () => {
    setEditingPermit(null);
    setPermitDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Info + Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

      {/* Tabs: Trucks & Permits */}
      <Tabs defaultValue="trucks">
        <TabsList>
          <TabsTrigger value="trucks" className="gap-2">
            <TruckIcon className="w-4 h-4" />
            Caminhões ({trucks?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="permits" className="gap-2">
            <FileCheck className="w-4 h-4" />
            Permits ({permits?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Trucks Tab */}
        <TabsContent value="trucks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display text-lg">Caminhões</CardTitle>
              <Button size="sm" onClick={handleNewTruck}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {!trucks?.length ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum caminhão vinculado a este cliente.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placa</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>VIN</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trucks.map((truck) => (
                      <TableRow key={truck.id}>
                        <TableCell className="font-medium">{truck.plate}</TableCell>
                        <TableCell>{[truck.make, truck.model].filter(Boolean).join(" ") || "—"}</TableCell>
                        <TableCell>{truck.year || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{truck.vin || "—"}</TableCell>
                        <TableCell>
                          <Badge className={truck.status === "active" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                            {truck.status === "active" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditTruck(truck)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover caminhão?</AlertDialogTitle>
                                  <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteTruck.mutate(truck.id)}>Remover</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permits Tab */}
        <TabsContent value="permits" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display text-lg">Permits</CardTitle>
              <Button size="sm" onClick={handleNewPermit}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {!permits?.length ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum permit vinculado a este cliente.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Caminhão</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
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
                          <TableCell>
                            {permit.expiration_date
                              ? format(new Date(permit.expiration_date), "dd/MM/yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={expStatus.color}>{expStatus.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditPermit(permit)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover permit?</AlertDialogTitle>
                                    <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deletePermit.mutate(permit.id)}>Remover</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
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
      </Tabs>

      {/* Dialogs */}
      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
      <TruckFormDialog open={truckDialogOpen} onOpenChange={setTruckDialogOpen} truck={editingTruck} defaultClientId={id} />
      <PermitFormDialog open={permitDialogOpen} onOpenChange={setPermitDialogOpen} permit={editingPermit} defaultClientId={id} />
    </div>
  );
}
