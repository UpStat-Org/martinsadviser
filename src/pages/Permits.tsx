import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Loader2, FileText, ExternalLink } from "lucide-react";
import { usePermits, useDeletePermit, getExpirationStatus } from "@/hooks/usePermits";
import { PermitFormDialog } from "@/components/PermitFormDialog";
import type { Permit } from "@/hooks/usePermits";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const statusFilters = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "expired", label: "Vencidos" },
  { value: "pending", label: "Pendentes" },
];

export default function Permits() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);
  const { data: permits, isLoading } = usePermits(search || undefined, undefined, statusFilter);
  const deletePermit = useDeletePermit();

  const handleEdit = (permit: Permit) => {
    setEditingPermit(permit);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingPermit(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Permits</h1>
          <p className="text-muted-foreground mt-1">Controle de IRP, IFTA, UCR, Oversize e mais</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Permit
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar permits..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {statusFilters.map((f) => (
            <Badge
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Badge>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !permits?.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum permit cadastrado ainda.</p>
            <Button variant="outline" className="mt-4" onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar primeiro permit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Caminhão</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Doc</TableHead>
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
                      <TableCell>{(permit as any).clients?.company_name || "—"}</TableCell>
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
                        {permit.document_url ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={permit.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                              >
                                <FileText className="w-4 h-4" />
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>Abrir documento</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(permit)}>
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
                                <AlertDialogDescription>
                                  Essa ação não pode ser desfeita.
                                </AlertDialogDescription>
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
          </CardContent>
        </Card>
      )}

      <PermitFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        permit={editingPermit}
      />
    </div>
  );
}
