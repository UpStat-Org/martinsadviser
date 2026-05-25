import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreatePermit, useUpdatePermit, PERMIT_TYPES, permitCategory, type Permit, type PermitInsert } from "@/hooks/usePermits";
import { useClients } from "@/hooks/useClients";
import { useTrucks } from "@/hooks/useTrucks";
import { useEmployees, employeeName } from "@/hooks/useEmployees";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrg } from "@/contexts/OrgContext";

const formSchema = z.object({
  client_id: z.string().min(1),
  truck_id: z.string().optional(),
  permit_type: z.string().min(1),
  permit_number: z.string().optional(),
  state: z.string().optional(),
  expiration_date: z.string().optional(),
  status: z.string().default("active"),
  notes: z.string().optional(),
  assigned_to: z.string().optional(),
  // Hazmat metadata
  hm_class: z.string().optional(),
  un_number: z.string().optional(),
  packing_group: z.string().optional(),
  shipping_name: z.string().optional(),
  // Border-crossing metadata
  port_code: z.string().optional(),
  entry_type: z.string().optional(),
  bond_number: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permit?: Permit | null;
  defaultClientId?: string;
  defaultTruckId?: string;
}

export function PermitFormDialog({ open, onOpenChange, permit, defaultClientId, defaultTruckId }: Props) {
  const createPermit = useCreatePermit();
  const updatePermit = useUpdatePermit();
  const { data: clients } = useClients();
  const { data: employees } = useEmployees();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { currentOrg } = useOrg();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isEditing = !!permit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: permit
      ? {
          client_id: permit.client_id,
          truck_id: permit.truck_id || "",
          permit_type: permit.permit_type,
          permit_number: permit.permit_number || "",
          state: permit.state || "",
          expiration_date: permit.expiration_date || "",
          status: permit.status,
          notes: permit.notes || "",
          assigned_to: permit.assigned_to || "",
          // Metadata fields (jsonb-on-row, added by migration 20260521190000).
          // Safe-access via cast since auto-gen types may not be regenerated yet.
          hm_class: (permit as Permit & { metadata?: Record<string, string> }).metadata?.hm_class ?? "",
          un_number: (permit as Permit & { metadata?: Record<string, string> }).metadata?.un_number ?? "",
          packing_group: (permit as Permit & { metadata?: Record<string, string> }).metadata?.packing_group ?? "",
          shipping_name: (permit as Permit & { metadata?: Record<string, string> }).metadata?.shipping_name ?? "",
          port_code: (permit as Permit & { metadata?: Record<string, string> }).metadata?.port_code ?? "",
          entry_type: (permit as Permit & { metadata?: Record<string, string> }).metadata?.entry_type ?? "",
          bond_number: (permit as Permit & { metadata?: Record<string, string> }).metadata?.bond_number ?? "",
        }
      : {
          client_id: defaultClientId || "",
          truck_id: defaultTruckId || "",
          permit_type: "",
          permit_number: "",
          state: "",
          expiration_date: "",
          status: "active",
          notes: "",
          assigned_to: "",
          hm_class: "",
          un_number: "",
          packing_group: "",
          shipping_name: "",
          port_code: "",
          entry_type: "",
          bond_number: "",
        },
  });

  const selectedClientId = form.watch("client_id");
  const { data: trucks } = useTrucks(undefined, selectedClientId || undefined);

  useEffect(() => {
    if (!open) return;
    form.reset(
      permit
        ? {
            client_id: permit.client_id,
            truck_id: permit.truck_id || "",
            permit_type: permit.permit_type,
            permit_number: permit.permit_number || "",
            state: permit.state || "",
            expiration_date: permit.expiration_date || "",
            status: permit.status,
            notes: permit.notes || "",
            assigned_to: permit.assigned_to || "",
            hm_class: (permit as Permit & { metadata?: Record<string, string> }).metadata?.hm_class ?? "",
            un_number: (permit as Permit & { metadata?: Record<string, string> }).metadata?.un_number ?? "",
            packing_group: (permit as Permit & { metadata?: Record<string, string> }).metadata?.packing_group ?? "",
            shipping_name: (permit as Permit & { metadata?: Record<string, string> }).metadata?.shipping_name ?? "",
            port_code: (permit as Permit & { metadata?: Record<string, string> }).metadata?.port_code ?? "",
            entry_type: (permit as Permit & { metadata?: Record<string, string> }).metadata?.entry_type ?? "",
            bond_number: (permit as Permit & { metadata?: Record<string, string> }).metadata?.bond_number ?? "",
          }
        : {
            client_id: defaultClientId || "",
            truck_id: defaultTruckId || "",
            permit_type: "",
            permit_number: "",
            state: "",
            expiration_date: "",
            status: "active",
            notes: "",
            assigned_to: "",
            hm_class: "",
            un_number: "",
            packing_group: "",
            shipping_name: "",
            port_code: "",
            entry_type: "",
            bond_number: "",
          }
    );
  }, [open, permit, defaultClientId, defaultTruckId, form]);

  const uploadFile = async (permitId: string): Promise<string | null> => {
    if (!selectedFile) return permit?.document_url || null;
    if (!currentOrg?.id) {
      toast({ title: t("documents.uploadError"), description: "No active organization", variant: "destructive" });
      return permit?.document_url || null;
    }

    const fileExt = selectedFile.name.split(".").pop();
    // Org_id prefix is enforced by storage policies — uploading without it will be rejected.
    const filePath = `${currentOrg.id}/${permitId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("permit-documents")
      .upload(filePath, selectedFile, { upsert: true });

    if (error) {
      toast({ title: t("documents.uploadError"), description: error.message, variant: "destructive" });
      return permit?.document_url || null;
    }

    // Store just the path; the bucket is private and we mint a short-lived
    // signed URL on the read side via useDocumentUrl.
    return filePath;
  };

  const onSubmit = async (values: FormValues) => {
    setUploading(true);
    try {
      // Only persist metadata for the categories that use it; for other
      // permit types the column stays as the default {} so we don't bloat
      // generic rows with empty-string fields.
      const cat = permitCategory(values.permit_type);
      let metadata: Record<string, string> | undefined;
      if (cat === "hazmat") {
        metadata = {};
        if (values.hm_class) metadata.hm_class = values.hm_class;
        if (values.un_number) metadata.un_number = values.un_number;
        if (values.packing_group) metadata.packing_group = values.packing_group;
        if (values.shipping_name) metadata.shipping_name = values.shipping_name;
      } else if (cat === "border") {
        metadata = {};
        if (values.port_code) metadata.port_code = values.port_code;
        if (values.entry_type) metadata.entry_type = values.entry_type;
        if (values.bond_number) metadata.bond_number = values.bond_number;
      }

      const payload: Omit<PermitInsert, "user_id"> = {
        client_id: values.client_id,
        truck_id: values.truck_id && values.truck_id !== "none" ? values.truck_id : null,
        permit_type: values.permit_type,
        permit_number: values.permit_number || null,
        state: values.state || null,
        expiration_date: values.expiration_date || null,
        status: values.status,
        notes: values.notes || null,
        assigned_to: values.assigned_to && values.assigned_to !== "none" ? values.assigned_to : null,
        ...(metadata !== undefined ? { metadata } : {}),
      } as Omit<PermitInsert, "user_id">;

      let savedPermit: Permit;
      if (isEditing) {
        savedPermit = await updatePermit.mutateAsync({ id: permit.id, ...payload });
      } else {
        savedPermit = await createPermit.mutateAsync(payload);
      }

      // Upload file and update document_url
      const documentUrl = await uploadFile(savedPermit.id);
      if (documentUrl && documentUrl !== savedPermit.document_url) {
        await updatePermit.mutateAsync({ id: savedPermit.id, document_url: documentUrl });
      }

      onOpenChange(false);
      form.reset();
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const validateAndSetFile = useCallback((file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: t("documents.tooLarge"), description: t("documents.maxSize"), variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  }, [toast, t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  }, [validateAndSetFile]);

  const isPending = createPermit.isPending || updatePermit.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSelectedFile(null); setIsDragging(false); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? t("permits.form.edit") : t("permits.new")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("permits.form.clientLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t("permits.form.selectClient")} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="truck_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("permits.form.truckOptional")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t("permits.form.selectTruck")} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t("permits.form.none")}</SelectItem>
                      {trucks?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.plate} {t.make ? `- ${t.make} ${t.model || ""}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="permit_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("permits.form.typeLabel")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t("permits.form.typePlaceholder")} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PERMIT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permit_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.number")}</FormLabel>
                    <FormControl><Input placeholder={t("permits.form.numberPlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.state")}</FormLabel>
                    <FormControl><Input placeholder={t("permits.form.statePlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiration_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.expiration")}</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Conditional metadata block — shows up only when the chosen
                permit_type is hazmat or border-crossing. Bound to the same
                FormField wrappers so empty fields just don't get persisted. */}
            {(() => {
              const cat = permitCategory(form.watch("permit_type"));
              if (cat === "hazmat") {
                return (
                  <div className="rounded-md bg-muted/40 border border-border/50 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("permits.metadata.hazmat")}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="hm_class" render={({ field }) => (
                        <FormItem><FormLabel>{t("permits.metadata.hmClass")}</FormLabel><FormControl><Input placeholder="1.4S, 3, 8…" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="un_number" render={({ field }) => (
                        <FormItem><FormLabel>{t("permits.metadata.unNumber")}</FormLabel><FormControl><Input placeholder="UN1203" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="packing_group" render={({ field }) => (
                        <FormItem><FormLabel>{t("permits.metadata.packingGroup")}</FormLabel><FormControl><Input placeholder="I / II / III" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="shipping_name" render={({ field }) => (
                        <FormItem><FormLabel>{t("permits.metadata.shippingName")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>
                );
              }
              if (cat === "border") {
                return (
                  <div className="rounded-md bg-muted/40 border border-border/50 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("permits.metadata.border")}</p>
                    <div className="grid grid-cols-3 gap-3">
                      <FormField control={form.control} name="port_code" render={({ field }) => (
                        <FormItem><FormLabel>{t("permits.metadata.portCode")}</FormLabel><FormControl><Input placeholder="Laredo / Detroit…" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="entry_type" render={({ field }) => (
                        <FormItem><FormLabel>{t("permits.metadata.entryType")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="bond_number" render={({ field }) => (
                        <FormItem><FormLabel>{t("permits.metadata.bondNumber")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("permits.form.responsible")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "none"}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t("permits.form.noResponsible")} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t("permits.form.noResponsible")}</SelectItem>
                      {employees?.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{employeeName(e)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("clients.status")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">{t("common.active")}</SelectItem>
                      <SelectItem value="expired">{t("common.expired")}</SelectItem>
                      <SelectItem value="pending">{t("common.pending")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File upload with drag-and-drop */}
            <div className="space-y-2">
              <FormLabel>{t("common.doc")} (PDF)</FormLabel>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                  <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setSelectedFile(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : permit?.document_url ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1">{t("documents.attached")}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    {t("documents.replace")}
                  </Button>
                </div>
              ) : (
                <div
                  className={`flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className={`w-6 h-6 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm text-muted-foreground text-center">{t("documents.dragDrop")}</p>
                  <p className="text-xs text-muted-foreground/70">{t("documents.maxSize")}</p>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("permits.form.notes")}</FormLabel>
                  <FormControl><Textarea rows={2} placeholder={t("permits.form.notesPlaceholder")} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("common.saving")}</> : isEditing ? t("common.save") : t("permits.form.create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
