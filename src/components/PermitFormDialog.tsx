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

  const onSubmit = async (values: FormValues) => {
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

    if (isEditing) {
      await updatePermit.mutateAsync({ id: permit.id, ...payload });
    } else {
      await createPermit.mutateAsync(payload);
    }
    onOpenChange(false);
    form.reset();
  };

  const isPending = createPermit.isPending || updatePermit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                      <SelectItem value="">Nenhum</SelectItem>
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
                {isPending ? "Salvando..." : isEditing ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
