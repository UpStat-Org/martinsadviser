import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateClient, useUpdateClient, type Client } from "@/hooks/useClients";
import { useFmcsaLookup } from "@/hooks/useFmcsaLookup";
import { Loader2, Search } from "lucide-react";

const formSchema = z.object({
  company_name: z.string().min(1, "Nome da empresa é obrigatório"),
  registration_responsible: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  ein: z.string().optional(),
  dot: z.string().optional(),
  mc: z.string().optional(),
  status: z.string().default("active"),
  service_ifta: z.boolean().default(false),
  service_ct: z.boolean().default(false),
  service_ny: z.boolean().default(false),
  service_kyu: z.boolean().default(false),
  service_nm: z.boolean().default(false),
  service_automatic: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const services = [
  { key: "service_ifta" as const, label: "IFTA" },
  { key: "service_ct" as const, label: "CT" },
  { key: "service_ny" as const, label: "NY" },
  { key: "service_kyu" as const, label: "KYU" },
  { key: "service_nm" as const, label: "NM" },
  { key: "service_automatic" as const, label: "Automatic" },
];

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

export function ClientFormDialog({ open, onOpenChange, client }: ClientFormDialogProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const { lookup, loading: lookingUp } = useFmcsaLookup();
  const isEditing = !!client;

  const handleDotLookup = async () => {
    const dotValue = form.getValues("dot");
    const data = await lookup(dotValue || "");
    if (data) {
      if (data.company_name) form.setValue("company_name", data.company_name);
      if (data.phone) form.setValue("phone", data.phone);
      if (data.address) form.setValue("address", data.address);
      if (data.mc) form.setValue("mc", data.mc);
      if (data.ein) form.setValue("ein", data.ein);
      if (data.dot) form.setValue("dot", data.dot);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: client
      ? {
          company_name: client.company_name,
          registration_responsible: (client as any).registration_responsible || "",
          phone: client.phone || "",
          email: client.email || "",
          address: client.address || "",
          ein: client.ein || "",
          dot: client.dot || "",
          mc: client.mc || "",
          status: client.status,
          service_ifta: client.service_ifta,
          service_ct: client.service_ct,
          service_ny: client.service_ny,
          service_kyu: client.service_kyu,
          service_nm: client.service_nm,
          service_automatic: client.service_automatic,
          notes: client.notes || "",
        }
      : {
          company_name: "",
          registration_responsible: "",
          phone: "",
          email: "",
          address: "",
          ein: "",
          dot: "",
          mc: "",
          status: "active",
          service_ifta: false,
          service_ct: false,
          service_ny: false,
          service_kyu: false,
          service_nm: false,
          service_automatic: false,
          notes: "",
        },
  });

  const onSubmit = async (values: FormValues) => {
    const payload = {
      company_name: values.company_name,
      registration_responsible: values.registration_responsible || null,
      status: values.status,
      service_ifta: values.service_ifta,
      service_ct: values.service_ct,
      service_ny: values.service_ny,
      service_kyu: values.service_kyu,
      service_nm: values.service_nm,
      service_automatic: values.service_automatic,
      phone: values.phone || null,
      email: values.email || null,
      address: values.address || null,
      ein: values.ein || null,
      dot: values.dot || null,
      mc: values.mc || null,
      notes: values.notes || null,
    };

    if (isEditing) {
      await updateClient.mutateAsync({ id: client.id, ...payload });
    } else {
      await createClient.mutateAsync(payload);
    }
    onOpenChange(false);
    form.reset();
  };

  const isPending = createClient.isPending || updateClient.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registration_responsible"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome do Responsável do Cadastro</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do responsável" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Endereço completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ein"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>EIN</FormLabel>
                    <FormControl>
                      <Input placeholder="XX-XXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DOT #</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="USDOT Number" {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleDotLookup}
                        disabled={lookingUp}
                        title="Buscar dados FMCSA"
                      >
                        {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MC #</FormLabel>
                    <FormControl>
                      <Input placeholder="MC Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Services */}
            <div>
              <h3 className="text-sm font-medium mb-3">Serviços</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {services.map((service) => (
                  <FormField
                    key={service.key}
                    control={form.control}
                    name={service.key}
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          {service.label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações sobre o cliente..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : isEditing ? "Salvar" : "Criar Cliente"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
