import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, UserCircle2, Pencil, Trash2, FileText } from "lucide-react";
import { useDrivers, useDeleteDriver, type Driver } from "@/hooks/useDrivers";
import { DriverFormDialog } from "@/components/DriverFormDialog";
import { DqfChecklist } from "@/components/DqfChecklist";
import { HosViolationsPanel } from "@/components/HosViolationsPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

function ExpiryCell({ date }: { date: string | null }) {
  const { t } = useLanguage();
  if (!date) return <span className="text-xs text-muted-foreground">—</span>;
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  const overdue = days < 0;
  const soon = days >= 0 && days <= 30;
  return (
    <div className="flex flex-col">
      <span className="text-xs">{format(new Date(date), "MMM dd, yyyy")}</span>
      {overdue && <span className="text-[10px] font-bold text-destructive">{t("drivers.overdueLabel")}</span>}
      {soon && <span className="text-[10px] font-bold text-warning">{t("drivers.expiresIn").replace("{days}", String(days))}</span>}
    </div>
  );
}

const STATUS_BADGE: Record<Driver["status"], string> = {
  active: "bg-success/10 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
  terminated: "bg-destructive/10 text-destructive border-destructive/30",
};

export function DriversPanel({ clientId }: { clientId: string }) {
  const { t } = useLanguage();
  const { data: drivers, isLoading } = useDrivers(clientId);
  const deleteMut = useDeleteDriver();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [dqfFor, setDqfFor] = useState<Driver | null>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
              <UserCircle2 className="w-4 h-4 text-secondary-foreground" />
            </div>
            <CardTitle className="text-sm font-semibold">
              {t("drivers.title")} {drivers ? `(${drivers.length})` : ""}
            </CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("drivers.add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t("common.loading")}</p>
        ) : !drivers?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("drivers.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("drivers.col.name")}</TableHead>
                <TableHead>{t("drivers.col.cdl")}</TableHead>
                <TableHead>{t("drivers.col.cdlExpiry")}</TableHead>
                <TableHead>{t("drivers.col.medCard")}</TableHead>
                <TableHead>{t("clients.status")}</TableHead>
                <TableHead className="text-right">{t("drivers.col.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.full_name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {d.cdl_number ? (
                      <span>
                        {d.cdl_number}
                        {d.cdl_state && <span className="text-muted-foreground"> · {d.cdl_state}</span>}
                        {d.cdl_class && <span className="text-muted-foreground"> · Class {d.cdl_class}</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell><ExpiryCell date={d.cdl_expires_on} /></TableCell>
                  <TableCell><ExpiryCell date={d.medical_card_expires_on} /></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_BADGE[d.status]}>
                      {t(`drivers.status.${d.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("drivers.dqfButtonTitle")}
                        onClick={() => setDqfFor(d)}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(d);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(t("drivers.confirmDelete").replace("{name}", d.full_name))) deleteMut.mutate(d.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <DriverFormDialog open={open} onOpenChange={setOpen} clientId={clientId} driver={editing} />

      <Dialog open={!!dqfFor} onOpenChange={(v) => !v && setDqfFor(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none space-y-4">
          {dqfFor && (
            <>
              <DqfChecklist driverId={dqfFor.id} driverName={dqfFor.full_name} />
              <HosViolationsPanel driverId={dqfFor.id} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
