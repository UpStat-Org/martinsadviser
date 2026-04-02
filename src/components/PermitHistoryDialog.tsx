import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { History, Loader2, FileCheck, RefreshCw, Pencil, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { usePermitHistory } from "@/hooks/usePermitHistory";

interface PermitHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permitId: string;
  permitLabel: string;
}

const changeTypeConfig: Record<string, { label: string; icon: typeof History; color: string }> = {
  created: { label: "Criado", icon: Plus, color: "bg-success/10 text-success" },
  updated: { label: "Atualizado", icon: Pencil, color: "bg-primary/10 text-primary" },
  renewed: { label: "Renovado", icon: RefreshCw, color: "bg-warning/10 text-warning" },
  expired: { label: "Expirado", icon: FileCheck, color: "bg-destructive/10 text-destructive" },
};

function formatChanges(values: Record<string, any> | null): string[] {
  if (!values) return [];
  const labels: Record<string, string> = {
    permit_type: "Tipo",
    permit_number: "Número",
    state: "Estado",
    expiration_date: "Validade",
    status: "Status",
    notes: "Notas",
    document_url: "Documento",
    truck_id: "Caminhão",
  };
  return Object.entries(values)
    .filter(([key]) => labels[key])
    .map(([key, val]) => `${labels[key]}: ${val ?? "—"}`);
}

export function PermitHistoryDialog({ open, onOpenChange, permitId, permitLabel }: PermitHistoryDialogProps) {
  const { data: history, isLoading } = usePermitHistory(open ? permitId : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            Histórico — {permitLabel}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !history?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum histórico registrado.</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {history.map((entry) => {
                const config = changeTypeConfig[entry.change_type] || changeTypeConfig.updated;
                const Icon = config.icon;
                const oldLines = formatChanges(entry.old_values as Record<string, any> | null);
                const newLines = formatChanges(entry.new_values as Record<string, any> | null);

                return (
                  <div key={entry.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2 top-1 w-5 h-5 rounded-full flex items-center justify-center ${config.color}`}>
                      <Icon className="w-3 h-3" />
                    </div>

                    <div className="rounded-lg border p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                        </span>
                      </div>

                      {entry.notes && (
                        <p className="text-sm text-muted-foreground">{entry.notes}</p>
                      )}

                      {oldLines.length > 0 && (
                        <div className="text-xs space-y-0.5">
                          <span className="font-medium text-destructive/80">Anterior:</span>
                          {oldLines.map((line, i) => (
                            <div key={i} className="text-muted-foreground pl-2">{line}</div>
                          ))}
                        </div>
                      )}

                      {newLines.length > 0 && (
                        <div className="text-xs space-y-0.5">
                          <span className="font-medium text-success/80">Novo:</span>
                          {newLines.map((line, i) => (
                            <div key={i} className="text-muted-foreground pl-2">{line}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
