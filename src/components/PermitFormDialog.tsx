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
import { useCreatePermit, useUpdatePermit, PERMIT_TYPES, type Permit } from "@/hooks/usePermits";
import { useClients } from "@/hooks/useClients";
import { useTrucks } from "@/hooks/useTrucks";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  client_id: z.string().min(1, "Cliente é obrigatório"),
  truck_id: z.string().optional(),
  permit_type: z.string().min(1, "Tipo é obrigatório"),
  permit_number: z.string().optional(),
  state: z.string().optional(),
  expiration_date: z.string().optional(),
  status: z.string().default("active"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permit?: Permit | null;
  defaultClientId?: string;
}

export function PermitFormDialog({ open, onOpenChange, permit, defaultClientId }: Props) {
  const createPermit = useCreatePermit();
  const updatePermit = useUpdatePermit();
  const { data: clients } = useClients();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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
        }
      : {
          client_id: defaultClientId || "",
          truck_id: "",
          permit_type: "",
          permit_number: "",
          state: "",
          expiration_date: "",
          status: "active",
          notes: "",
        },
  });

  const selectedClientId = form.watch("client_id");
  const { data: trucks } = useTrucks(undefined, selectedClientId || undefined);

  const uploadFile = async (permitId: string): Promise<string | null> => {
    if (!selectedFile) return permit?.document_url || null;

    const fileExt = selectedFile.name.split(".").pop();
    const filePath = `${permitId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("permit-documents")
      .upload(filePath, selectedFile, { upsert: true });

    if (error) {
      toast({ title: "Erro ao enviar arquivo", description: error.message, variant: "destructive" });
      return permit?.document_url || null;
    }

    const { data: urlData } = supabase.storage
      .from("permit-documents")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const onSubmit = async (values: FormValues) => {
    setUploading(true);
    try {
      const payload = {
        client_id: values.client_id,
        truck_id: values.truck_id || null,
        permit_type: values.permit_type,
        permit_number: values.permit_number || null,
        state: values.state || null,
        expiration_date: values.expiration_date || null,
        status: values.status,
        notes: values.notes || null,
      };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo de 20MB", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const isPending = createPermit.isPending || updatePermit.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSelectedFile(null); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? "Editar Permit" : "Novo Permit"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
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
                  <FormLabel>Caminhão (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione o caminhão" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
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
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Tipo do permit" /></SelectTrigger>
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
                    <FormLabel>Número</FormLabel>
                    <FormControl><Input placeholder="Nº do permit" {...field} /></FormControl>
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
                    <FormLabel>Estado</FormLabel>
                    <FormControl><Input placeholder="Ex: TX, CA..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiration_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimento</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="expired">Vencido</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File upload */}
            <div className="space-y-2">
              <FormLabel>Documento (PDF)</FormLabel>
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
                  <span className="text-sm text-muted-foreground flex-1">Documento já anexado</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Substituir
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar arquivo
                </Button>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Observações..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : isEditing ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
