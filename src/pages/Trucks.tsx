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
import { Plus, Search, Pencil, Trash2, Loader2, Truck as TruckIcon } from "lucide-react";
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
    <div className="space-y-6 animate-fade-in">
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
          <Input placeholder={t("trucks.search")} className="pl-10 bg-muted/30 border-border/60 focus:bg-background transition-colors" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !trucks?.length ? (
        <Card className="shadow-soft">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <TruckIcon className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-lg">{t("trucks.empty")}</p>
            <Button variant="outline" className="mt-4" onClick={handleNew}><Plus className="w-4 h-4 mr-2" />{t("trucks.registerFirst")}</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">{t("trucks.plate")}</TableHead>
                  <TableHead className="font-semibold">{t("common.client")}</TableHead>
                  <TableHead className="font-semibold">{t("trucks.makeModel")}</TableHead>
                  <TableHead className="font-semibold">{t("trucks.year")}</TableHead>
                  <TableHead className="font-semibold">VIN</TableHead>
                  <TableHead className="font-semibold">{t("clients.status")}</TableHead>
                  <TableHead className="w-24 font-semibold">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucks.map((truck) => (
                  <TableRow key={truck.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-medium">{truck.plate}</TableCell>
                    <TableCell>{(truck as any).clients?.company_name || "—"}</TableCell>
                    <TableCell>{[truck.make, truck.model].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{truck.year || "—"}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{truck.vin || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={truck.status === "active" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
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
