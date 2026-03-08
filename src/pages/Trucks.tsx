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
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { useTrucks, useDeleteTruck } from "@/hooks/useTrucks";
import { TruckFormDialog } from "@/components/TruckFormDialog";
import type { Truck } from "@/hooks/useTrucks";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Trucks() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const { data: trucks, isLoading } = useTrucks(search || undefined);
  const deleteTruck = useDeleteTruck();
  const { t } = useLanguage();

  const handleEdit = (truck: Truck) => { setEditingTruck(truck); setDialogOpen(true); };
  const handleNew = () => { setEditingTruck(null); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{t("trucks.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("trucks.subtitle")}</p>
        </div>
        <Button onClick={handleNew}><Plus className="w-4 h-4 mr-2" />{t("trucks.new")}</Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("trucks.search")} className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !trucks?.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">{t("trucks.empty")}</p>
            <Button variant="outline" className="mt-4" onClick={handleNew}><Plus className="w-4 h-4 mr-2" />{t("trucks.registerFirst")}</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("trucks.plate")}</TableHead>
                  <TableHead>{t("common.client")}</TableHead>
                  <TableHead>{t("trucks.makeModel")}</TableHead>
                  <TableHead>{t("trucks.year")}</TableHead>
                  <TableHead>VIN</TableHead>
                  <TableHead>{t("clients.status")}</TableHead>
                  <TableHead className="w-24">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucks.map((truck) => (
                  <TableRow key={truck.id}>
                    <TableCell className="font-medium">{truck.plate}</TableCell>
                    <TableCell>{(truck as any).clients?.company_name || "—"}</TableCell>
                    <TableCell>{[truck.make, truck.model].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{truck.year || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{truck.vin || "—"}</TableCell>
                    <TableCell>
                      <Badge className={truck.status === "active" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                        {truck.status === "active" ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(truck)}><Pencil className="w-4 h-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("trucks.removeTruck")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("trucks.removeTruckDesc")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTruck.mutate(truck.id)}>{t("common.delete")}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <TruckFormDialog open={dialogOpen} onOpenChange={setDialogOpen} truck={editingTruck} />
    </div>
  );
}
