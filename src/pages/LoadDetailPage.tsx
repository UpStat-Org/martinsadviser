import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, MapPin, Truck, IdCard, Receipt, Package, Plus, Trash2,
  Upload, FileText, Loader2, CalendarClock, Route,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { DocumentLink } from "@/components/DocumentLink";
import { LoadTrackingPanel } from "@/components/LoadTrackingPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrg } from "@/contexts/OrgContext";
import { useRegion } from "@/hooks/useRegion";
import { useToast } from "@/hooks/use-toast";
import { useTrucks } from "@/hooks/useTrucks";
import { useDrivers } from "@/hooks/useDrivers";
import { uploadComplianceDocument } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLoad, useUpdateLoad, useInvoiceLoad, useLoadStops, useUpsertLoadStop,
  useDeleteLoadStop, useLoadDocuments,
  laneLabel, ratePerDistance, isReadyToInvoice,
  LOAD_STATUSES,
  type LoadStatus, type LoadStop,
} from "@/hooks/useLoads";
import { errorMessage } from "@/lib/utils";

const STATUS_TONE: Record<LoadStatus, StatusTone> = {
  quoted: "neutral",
  booked: "info",
  dispatched: "warning",
  in_transit: "warning",
  delivered: "success",
  cancelled: "danger",
};

const DOC_KINDS = ["rate_con", "bol", "pod", "other"] as const;
type DocKind = (typeof DOC_KINDS)[number];

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}

export default function LoadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { currentOrg } = useOrg();
  const { money, dateTimeNumeric, dateNumeric } = useRegion();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: load, isLoading } = useLoad(id);
  const { data: stops } = useLoadStops(id);
  const { data: documents } = useLoadDocuments(id);
  const { data: trucks } = useTrucks();
  const { data: drivers } = useDrivers();

  const updateLoad = useUpdateLoad();
  const invoiceLoad = useInvoiceLoad();
  const upsertStop = useUpsertLoadStop();
  const deleteStop = useDeleteLoadStop();

  const [uploading, setUploading] = useState(false);
  const [docKind, setDocKind] = useState<DocKind>("pod");

  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-md" />;
  }
  if (!load) {
    return (
      <EmptyState
        icon={<Package className="w-8 h-8" />}
        title={t("loads.notFound")}
        description={t("loads.notFoundDesc")}
        action={<Button onClick={() => navigate("/loads")}>{t("loads.backToBoard")}</Button>}
      />
    );
  }

  const perDistance = ratePerDistance(load);

  const addStop = async (kind: "pickup" | "delivery") => {
    await upsertStop.mutateAsync({
      load_id: load.id,
      kind,
      position: (stops?.length ?? 0) + 1,
    });
  };

  const patchStop = (stop: LoadStop, patch: Partial<LoadStop>) =>
    upsertStop.mutate({ id: stop.id, load_id: load.id, ...patch });

  const uploadDocument = async (file: File) => {
    if (!currentOrg) return;
    setUploading(true);
    try {
      const path = await uploadComplianceDocument(currentOrg.id, "load", load.id, file);
      if (!path) throw new Error(t("loads.uploadFailed"));
      const db = supabase as unknown as {
        from: (table: string) => { insert: (row: unknown) => Promise<{ error: { message: string } | null }> };
      };
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await db.from("load_documents").insert({
        load_id: load.id,
        user_id: user?.id ?? null,
        kind: docKind,
        document_url: path,
        file_name: file.name,
      });
      if (error) throw new Error(error.message);
      qc.invalidateQueries({ queryKey: ["load_documents", load.id] });
      toast({ title: t("loads.uploaded") });
    } catch (e) {
      toast({ title: t("common.error"), description: errorMessage(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <Link to="/loads" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" /> {t("loads.title")}
          </Link>
        }
        title={load.reference || load.clients?.company_name || t("loads.untitled")}
        description={laneLabel(load) ?? undefined}
        meta={
          <div className="flex items-center gap-2">
            <StatusBadge tone={STATUS_TONE[load.status]}>
              {t(`loads.status.${load.status}`)}
            </StatusBadge>
            {load.invoice_id && (
              <Link
                to={`/finance/${load.invoice_id}`}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <Receipt className="w-3 h-3" /> {t("loads.viewInvoice")}
              </Link>
            )}
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={load.status}
              onValueChange={(v) => updateLoad.mutate({ id: load.id, status: v as LoadStatus })}
            >
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{t(`loads.status.${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isReadyToInvoice(load) && (
              <Button
                className="gap-2"
                disabled={invoiceLoad.isPending}
                onClick={() => invoiceLoad.mutate({ load })}
              >
                {invoiceLoad.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Receipt className="w-4 h-4" />}
                {t("loads.invoiceAction")}
              </Button>
            )}
          </div>
        }
      />

      <Card className="border-border/50">
        <CardContent className="p-5 grid gap-5 sm:grid-cols-3 lg:grid-cols-4">
          <Fact label={t("common.client")} value={
            <Link to={`/clients/${load.client_id}`} className="text-primary hover:underline">
              {load.clients?.company_name ?? "—"}
            </Link>
          } />
          <Fact label={t("loads.col.rate")} value={<span className="tabular-nums">{money(load.rate)}</span>} />
          <Fact
            label={t("loads.col.distance")}
            value={load.distance != null ? `${load.distance} ${load.distance_unit}` : "—"}
          />
          <Fact
            label={t("loads.ratePerDistance")}
            value={perDistance !== null
              ? <span className="tabular-nums">{money(perDistance)}/{load.distance_unit}</span>
              : "—"}
          />
          <Fact
            label={t("loads.col.pickup")}
            value={load.pickup_at ? dateTimeNumeric(new Date(load.pickup_at)) : "—"}
          />
          <Fact
            label={t("loads.col.delivery")}
            value={load.delivery_at ? dateTimeNumeric(new Date(load.delivery_at)) : "—"}
          />
          <Fact label={t("loads.col.commodity")} value={load.commodity} />
          <Fact
            label={t("loads.col.weight")}
            value={load.weight != null ? `${load.weight} ${load.weight_unit}` : "—"}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Alocação: quem leva. Editável direto aqui porque é o campo que mais
            muda depois da carga criada — motorista troca, caminhão quebra. */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4" /> {t("loads.assignment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Truck className="w-3 h-3" /> {t("nav.trucks")}
              </Label>
              <Select
                value={load.truck_id ?? ""}
                onValueChange={(v) => updateLoad.mutate({ id: load.id, truck_id: v || null })}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(trucks ?? []).map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>{tr.plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <IdCard className="w-3 h-3" /> {t("nav.drivers")}
              </Label>
              <Select
                value={load.driver_id ?? ""}
                onValueChange={(v) => updateLoad.mutate({ id: load.id, driver_id: v || null })}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(drivers ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {load.notes && (
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t("common.notes")}
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{load.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos: rate confirmation na entrada, POD na saída. */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> {t("loads.documents")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="load-doc-kind" className="text-xs">{t("loads.docKind")}</Label>
                <Select value={docKind} onValueChange={(v) => setDocKind(v as DocKind)}>
                  <SelectTrigger id="load-doc-kind" className="h-9 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>{t(`loads.doc.${k}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button asChild variant="outline" className="gap-2" disabled={uploading}>
                <label className="cursor-pointer">
                  {uploading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Upload className="w-4 h-4" />}
                  {t("loads.upload")}
                  <input
                    type="file"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      // Limpa o input para que reenviar o MESMO arquivo depois
                      // de um erro volte a disparar o onChange.
                      e.target.value = "";
                      if (file) uploadDocument(file);
                    }}
                  />
                </label>
              </Button>
            </div>

            {(documents ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t("loads.noDocuments")}</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {(documents ?? []).map((doc) => (
                  <li key={doc.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <DocumentLink
                        path={doc.document_url}
                        className="text-sm text-primary hover:underline truncate inline-flex items-center gap-1.5"
                      >
                        {doc.file_name || t("loads.document")}
                      </DocumentLink>
                      <p className="text-[11px] text-muted-foreground">
                        {t(`loads.doc.${doc.kind}`)} · {dateNumeric(new Date(doc.created_at))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <LoadTrackingPanel loadId={load.id} />

      {/* Paradas: opcional por design. Trajeto simples vive nas colunas da
          carga; esta tabela só existe quando a rota tem mais de duas pontas. */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="w-4 h-4" /> {t("loads.stops")}
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
              onClick={() => addStop("pickup")}>
              <Plus className="w-3 h-3" /> {t("loads.addPickup")}
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
              onClick={() => addStop("delivery")}>
              <Plus className="w-3 h-3" /> {t("loads.addDelivery")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(stops ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-5">{t("loads.noStops")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>{t("loads.stopKind")}</TableHead>
                    <TableHead>{t("loads.stopCompany")}</TableHead>
                    <TableHead>{t("common.city")}</TableHead>
                    <TableHead>{t("loads.stopWindow")}</TableHead>
                    <TableHead>{t("loads.stopArrived")}</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stops ?? []).map((stop) => (
                    <TableRow key={stop.id}>
                      <TableCell className="tabular-nums text-muted-foreground">{stop.position}</TableCell>
                      <TableCell>
                        <StatusBadge tone={stop.kind === "pickup" ? "info" : "success"} size="sm">
                          {t(`loads.stop.${stop.kind}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs"
                          defaultValue={stop.company_name ?? ""}
                          onBlur={(e) => {
                            if (e.target.value !== (stop.company_name ?? "")) {
                              patchStop(stop, { company_name: e.target.value || null });
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Input
                            className="h-8 text-xs"
                            defaultValue={stop.city ?? ""}
                            onBlur={(e) => {
                              if (e.target.value !== (stop.city ?? "")) {
                                patchStop(stop, { city: e.target.value || null });
                              }
                            }}
                          />
                          <Input
                            className="h-8 text-xs w-16"
                            defaultValue={stop.region ?? ""}
                            onBlur={(e) => {
                              if (e.target.value !== (stop.region ?? "")) {
                                patchStop(stop, { region: e.target.value || null });
                              }
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="datetime-local"
                          className="h-8 text-xs w-44"
                          defaultValue={stop.window_start ? stop.window_start.slice(0, 16) : ""}
                          onBlur={(e) => patchStop(stop, {
                            window_start: e.target.value ? new Date(e.target.value).toISOString() : null,
                          })}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {stop.arrived_at ? dateTimeNumeric(new Date(stop.arrived_at)) : (
                          <Button
                            size="sm" variant="ghost" className="h-7 text-xs gap-1"
                            onClick={() => patchStop(stop, { arrived_at: new Date().toISOString() })}
                          >
                            <CalendarClock className="w-3 h-3" /> {t("loads.markArrived")}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteStop.mutate({ id: stop.id, loadId: load.id })}
                          aria-label={t("common.delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
