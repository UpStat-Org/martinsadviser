import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Settings2,
  Truck,
  FileCheck,
  CheckCircle2,
  Plus,
  X,
  Loader2,
  Search,
} from "lucide-react";
import { useCreateClient } from "@/hooks/useClients";
import { useCreateTruck } from "@/hooks/useTrucks";
import { useCreatePermit, PERMIT_TYPES } from "@/hooks/usePermits";
import { useToast } from "@/hooks/use-toast";
import { useFmcsaLookup } from "@/hooks/useFmcsaLookup";

// --- Schemas ---
const clientSchema = z.object({
  company_name: z.string().min(1, "Nome da empresa é obrigatório"),
  registration_responsible: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  ein: z.string().optional(),
  dot: z.string().optional(),
  mc: z.string().optional(),
  notes: z.string().optional(),
});

type ClientValues = z.infer<typeof clientSchema>;

const services = [
  { key: "service_ifta" as const, label: "IFTA" },
  { key: "service_ct" as const, label: "CT" },
  { key: "service_ny" as const, label: "NY" },
  { key: "service_kyu" as const, label: "KYU" },
  { key: "service_nm" as const, label: "NM" },
  { key: "service_automatic" as const, label: "Automatic" },
];

interface TruckEntry {
  plate: string;
  vin: string;
  year: string;
  make: string;
  model: string;
}

interface PermitEntry {
  permit_type: string;
  permit_number: string;
  state: string;
  expiration_date: string;
  truck_index: number | null; // index into trucks array
}

const steps = [
  { icon: Building2, label: "Dados da Empresa" },
  { icon: Settings2, label: "Serviços" },
  { icon: Truck, label: "Caminhões" },
  { icon: FileCheck, label: "Permits" },
  { icon: CheckCircle2, label: "Revisão" },
];

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createClient = useCreateClient();
  const createTruck = useCreateTruck();
  const createPermit = useCreatePermit();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const { lookup, loading: lookingUp } = useFmcsaLookup();

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

  // Step 1: Client info
  const form = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      company_name: "",
      registration_responsible: "",
      phone: "",
      email: "",
      address: "",
      ein: "",
      dot: "",
      mc: "",
      notes: "",
    },
  });

  // Step 2: Services
  const [selectedServices, setSelectedServices] = useState<
    Record<string, boolean>
  >({
    service_ifta: false,
    service_ct: false,
    service_ny: false,
    service_kyu: false,
    service_nm: false,
    service_automatic: false,
  });

  // Step 3: Trucks
  const [trucks, setTrucks] = useState<TruckEntry[]>([]);
  const [truckDraft, setTruckDraft] = useState<TruckEntry>({
    plate: "",
    vin: "",
    year: "",
    make: "",
    model: "",
  });

  // Step 4: Permits
  const [permits, setPermits] = useState<PermitEntry[]>([]);
  const [permitDraft, setPermitDraft] = useState<PermitEntry>({
    permit_type: "",
    permit_number: "",
    state: "",
    expiration_date: "",
    truck_index: null,
  });

  const progress = ((step + 1) / steps.length) * 100;

  const addTruck = () => {
    if (!truckDraft.plate.trim()) {
      toast({ title: "Placa é obrigatória", variant: "destructive" });
      return;
    }
    setTrucks([...trucks, { ...truckDraft }]);
    setTruckDraft({ plate: "", vin: "", year: "", make: "", model: "" });
  };

  const removeTruck = (i: number) => {
    setTrucks(trucks.filter((_, idx) => idx !== i));
    // Also remove permits linked to this truck
    setPermits(
      permits
        .filter((p) => p.truck_index !== i)
        .map((p) => ({
          ...p,
          truck_index:
            p.truck_index !== null && p.truck_index > i
              ? p.truck_index - 1
              : p.truck_index,
        })),
    );
  };

  const addPermit = () => {
    if (!permitDraft.permit_type) {
      toast({ title: "Tipo do permit é obrigatório", variant: "destructive" });
      return;
    }
    setPermits([...permits, { ...permitDraft }]);
    setPermitDraft({
      permit_type: "",
      permit_number: "",
      state: "",
      expiration_date: "",
      truck_index: null,
    });
  };

  const removePermit = (i: number) =>
    setPermits(permits.filter((_, idx) => idx !== i));

  const nextStep = async () => {
    if (step === 0) {
      const valid = await form.trigger();
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    setSaving(true);
    try {
      const vals = form.getValues();
      const client = await createClient.mutateAsync({
        company_name: vals.company_name,
        registration_responsible: vals.registration_responsible || null,
        phone: vals.phone || null,
        email: vals.email || null,
        address: vals.address || null,
        ein: vals.ein || null,
        dot: vals.dot || null,
        mc: vals.mc || null,
        notes: vals.notes || null,
        status: "active",
        ...selectedServices,
      });

      // Create trucks and store IDs
      const truckIds: string[] = [];
      for (const t of trucks) {
        const saved = await createTruck.mutateAsync({
          client_id: client.id,
          plate: t.plate,
          vin: t.vin || null,
          year: t.year ? parseInt(t.year) : null,
          make: t.make || null,
          model: t.model || null,
          status: "active",
          notes: null,
        });
        truckIds.push(saved.id);
      }

      // Create permits
      for (const p of permits) {
        await createPermit.mutateAsync({
          client_id: client.id,
          truck_id: p.truck_index !== null ? truckIds[p.truck_index] : null,
          permit_type: p.permit_type,
          permit_number: p.permit_number || null,
          state: p.state || null,
          expiration_date: p.expiration_date || null,
          status: "active",
          notes: null,
        });
      }

      toast({
        title: "Cliente cadastrado com sucesso!",
        description: "Todos os dados foram salvos.",
      });
      navigate(`/clients/${client.id}`);
    } catch {
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/clients")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Cadastrar Novo Cliente
          </h1>
          <p className="text-sm text-muted-foreground">
            Passo {step + 1} de {steps.length}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <button
                key={i}
                onClick={() => i < step && setStep(i)}
                className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                  isActive
                    ? "text-primary font-semibold"
                    : isDone
                      ? "text-primary/60 cursor-pointer"
                      : "text-muted-foreground"
                }`}
                disabled={i > step}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isDone
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-muted bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="hidden sm:block">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* Step 0: Client Info */}
          {step === 0 && (
            <Form {...form}>
              <div className="space-y-4">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" /> Dados da
                    Empresa
                  </CardTitle>
                </CardHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome da Empresa *</FormLabel>
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
                        <FormLabel>Nome do Responsável *</FormLabel>
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
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
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
                          <Input
                            type="email"
                            placeholder="email@empresa.com"
                            {...field}
                          />
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
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input placeholder="Endereço completo" {...field} />
                        </FormControl>
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
                            {lookingUp ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
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
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="Notas sobre o cliente..."
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Form>
          )}

          {/* Step 1: Services */}
          {step === 1 && (
            <div className="space-y-4">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" /> Serviços
                  Contratados
                </CardTitle>
              </CardHeader>
              <p className="text-sm text-muted-foreground">
                Selecione os serviços que este cliente utiliza.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {services.map((s) => (
                  <label
                    key={s.key}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedServices[s.key]
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Checkbox
                      checked={selectedServices[s.key]}
                      onCheckedChange={(v) =>
                        setSelectedServices({
                          ...selectedServices,
                          [s.key]: !!v,
                        })
                      }
                    />
                    <span className="font-medium text-sm">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Trucks */}
          {step === 2 && (
            <div className="space-y-4">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" /> Caminhões
                </CardTitle>
              </CardHeader>
              <p className="text-sm text-muted-foreground">
                Adicione os caminhões da frota. Você pode pular e adicionar
                depois.
              </p>

              {/* Existing trucks */}
              {trucks.length > 0 && (
                <div className="space-y-2">
                  {trucks.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{t.plate}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[t.year, t.make, t.model]
                            .filter(Boolean)
                            .join(" ") || "Sem detalhes"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTruck(i)}
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add truck form */}
              <div className="p-4 rounded-lg border border-dashed space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Placa *
                    </label>
                    <Input
                      placeholder="ABC-1234"
                      value={truckDraft.plate}
                      onChange={(e) =>
                        setTruckDraft({ ...truckDraft, plate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      VIN
                    </label>
                    <Input
                      placeholder="VIN Number"
                      value={truckDraft.vin}
                      onChange={(e) =>
                        setTruckDraft({ ...truckDraft, vin: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Ano
                    </label>
                    <Input
                      placeholder="2024"
                      value={truckDraft.year}
                      onChange={(e) =>
                        setTruckDraft({ ...truckDraft, year: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Marca
                    </label>
                    <Input
                      placeholder="Freightliner"
                      value={truckDraft.make}
                      onChange={(e) =>
                        setTruckDraft({ ...truckDraft, make: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Modelo
                    </label>
                    <Input
                      placeholder="Cascadia"
                      value={truckDraft.model}
                      onChange={(e) =>
                        setTruckDraft({ ...truckDraft, model: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={addTruck}
                >
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Caminhão
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Permits */}
          {step === 3 && (
            <div className="space-y-4">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-primary" /> Permits
                </CardTitle>
              </CardHeader>
              <p className="text-sm text-muted-foreground">
                Adicione os permits do cliente. Você pode pular e adicionar
                depois.
              </p>

              {permits.length > 0 && (
                <div className="space-y-2">
                  {permits.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <FileCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {p.permit_type}{" "}
                          {p.permit_number && `— ${p.permit_number}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.state && `Estado: ${p.state}`}
                          {p.truck_index !== null &&
                            ` · Caminhão: ${trucks[p.truck_index]?.plate}`}
                          {p.expiration_date && ` · Venc: ${p.expiration_date}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePermit(i)}
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-lg border border-dashed space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Tipo *
                    </label>
                    <Select
                      value={permitDraft.permit_type}
                      onValueChange={(v) =>
                        setPermitDraft({ ...permitDraft, permit_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo do permit" />
                      </SelectTrigger>
                      <SelectContent>
                        {PERMIT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Número
                    </label>
                    <Input
                      placeholder="Nº do permit"
                      value={permitDraft.permit_number}
                      onChange={(e) =>
                        setPermitDraft({
                          ...permitDraft,
                          permit_number: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Estado
                    </label>
                    <Input
                      placeholder="TX, CA..."
                      value={permitDraft.state}
                      onChange={(e) =>
                        setPermitDraft({
                          ...permitDraft,
                          state: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Vencimento
                    </label>
                    <Input
                      type="date"
                      value={permitDraft.expiration_date}
                      onChange={(e) =>
                        setPermitDraft({
                          ...permitDraft,
                          expiration_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Caminhão
                    </label>
                    <Select
                      value={
                        permitDraft.truck_index !== null
                          ? String(permitDraft.truck_index)
                          : "none"
                      }
                      onValueChange={(v) =>
                        setPermitDraft({
                          ...permitDraft,
                          truck_index: v === "none" ? null : parseInt(v),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {trucks.map((t, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {t.plate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={addPermit}
                >
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Permit
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" /> Revisão
                  Final
                </CardTitle>
              </CardHeader>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Empresa
                  </h3>
                  <p className="text-sm font-medium">
                    {form.getValues("company_name")}
                  </p>
                  <p className="text-sm font-medium">
                    {form.getValues("registration_responsible")}
                  </p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {form.getValues("email") && (
                      <p>Email: {form.getValues("email")}</p>
                    )}
                    {form.getValues("phone") && (
                      <p>Tel: {form.getValues("phone")}</p>
                    )}
                    {form.getValues("dot") && (
                      <p>DOT: {form.getValues("dot")}</p>
                    )}
                    {form.getValues("mc") && <p>MC: {form.getValues("mc")}</p>}
                    {form.getValues("ein") && (
                      <p>EIN: {form.getValues("ein")}</p>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> Serviços
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {services
                      .filter((s) => selectedServices[s.key])
                      .map((s) => (
                        <Badge key={s.key}>{s.label}</Badge>
                      ))}
                    {!services.some((s) => selectedServices[s.key]) && (
                      <span className="text-xs text-muted-foreground">
                        Nenhum serviço selecionado
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Caminhões ({trucks.length})
                  </h3>
                  {trucks.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Nenhum caminhão adicionado
                    </span>
                  ) : (
                    <div className="space-y-1">
                      {trucks.map((t, i) => (
                        <p key={i} className="text-sm">
                          {t.plate}{" "}
                          {[t.year, t.make, t.model]
                            .filter(Boolean)
                            .join(" ") &&
                            `— ${[t.year, t.make, t.model].filter(Boolean).join(" ")}`}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileCheck className="w-4 h-4" /> Permits ({permits.length})
                  </h3>
                  {permits.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Nenhum permit adicionado
                    </span>
                  ) : (
                    <div className="space-y-1">
                      {permits.map((p, i) => (
                        <p key={i} className="text-sm">
                          {p.permit_type}{" "}
                          {p.permit_number && `#${p.permit_number}`}
                          {p.truck_index !== null &&
                            ` · ${trucks[p.truck_index]?.plate}`}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={step === 0 ? () => navigate("/clients") : prevStep}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 0 ? "Cancelar" : "Voltar"}
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={nextStep}>
            Próximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Finalizar Cadastro"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
