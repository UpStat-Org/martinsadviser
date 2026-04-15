import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Sparkles,
  Zap,
  Layers,
  Wand2,
  Phone,
  Mail,
  MapPin,
  Hash,
  User,
} from "lucide-react";
import { useCreateClient, useCheckClientDuplicate } from "@/hooks/useClients";
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
  { key: "service_ifta" as const, label: "IFTA", desc: "Int'l Fuel Tax", gradient: "from-indigo-500 to-violet-500" },
  { key: "service_ct" as const, label: "CT", desc: "Connecticut", gradient: "from-blue-500 to-cyan-500" },
  { key: "service_ny" as const, label: "NY", desc: "New York", gradient: "from-emerald-500 to-teal-500" },
  { key: "service_kyu" as const, label: "KYU", desc: "Kentucky U-Tax", gradient: "from-amber-500 to-orange-500" },
  { key: "service_nm" as const, label: "NM", desc: "New Mexico", gradient: "from-rose-500 to-red-500" },
  { key: "service_automatic" as const, label: "Automatic", desc: "Auto-renovação", gradient: "from-fuchsia-500 to-pink-500" },
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
  truck_index: number | null;
}

const steps = [
  { icon: Building2, label: "Empresa", gradient: "from-indigo-500 to-violet-500" },
  { icon: Settings2, label: "Serviços", gradient: "from-sky-500 to-blue-500" },
  { icon: Truck, label: "Caminhões", gradient: "from-emerald-500 to-teal-500" },
  { icon: FileCheck, label: "Permits", gradient: "from-amber-500 to-orange-500" },
  { icon: CheckCircle2, label: "Revisão", gradient: "from-fuchsia-500 to-pink-500" },
];

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createClient = useCreateClient();
  const createTruck = useCreateTruck();
  const createPermit = useCreatePermit();
  const checkDuplicate = useCheckClientDuplicate();

  const [templateSelected, setTemplateSelected] = useState(false);
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
      toast({ title: "Dados carregados do FMCSA", description: "Preencha os campos restantes." });
    }
  };

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

  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({
    service_ifta: false,
    service_ct: false,
    service_ny: false,
    service_kyu: false,
    service_nm: false,
    service_automatic: false,
  });

  const [trucks, setTrucks] = useState<TruckEntry[]>([]);
  const [truckDraft, setTruckDraft] = useState<TruckEntry>({
    plate: "",
    vin: "",
    year: "",
    make: "",
    model: "",
  });

  const [permits, setPermits] = useState<PermitEntry[]>([]);
  const [permitDraft, setPermitDraft] = useState<PermitEntry>({
    permit_type: "",
    permit_number: "",
    state: "",
    expiration_date: "",
    truck_index: null,
  });

  const serviceTemplates = [
    {
      name: "IFTA Only",
      desc: "Apenas serviço IFTA",
      icon: Zap,
      gradient: "from-indigo-500 to-violet-500",
      tags: ["IFTA"],
      services: { service_ifta: true, service_ct: false, service_ny: false, service_kyu: false, service_nm: false, service_automatic: false },
    },
    {
      name: "CT + NY",
      desc: "Combustível CT e NY",
      icon: Layers,
      gradient: "from-blue-500 to-cyan-500",
      tags: ["CT", "NY"],
      services: { service_ifta: false, service_ct: true, service_ny: true, service_kyu: false, service_nm: false, service_automatic: false },
    },
    {
      name: "Full Compliance",
      desc: "Todos os serviços ativos",
      icon: Sparkles,
      gradient: "from-emerald-500 to-teal-500",
      tags: ["IFTA", "CT", "NY", "KYU", "NM", "Auto"],
      services: { service_ifta: true, service_ct: true, service_ny: true, service_kyu: true, service_nm: true, service_automatic: true },
    },
    {
      name: "Personalizado",
      desc: "Escolha manualmente",
      icon: Wand2,
      gradient: "from-fuchsia-500 to-pink-500",
      tags: ["Manual"],
      services: { service_ifta: false, service_ct: false, service_ny: false, service_kyu: false, service_nm: false, service_automatic: false },
    },
  ];

  const applyTemplate = (tServices: Record<string, boolean>) => {
    setSelectedServices({ ...selectedServices, ...tServices });
    setTemplateSelected(true);
  };

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
    setPermits(
      permits
        .filter((p) => p.truck_index !== i)
        .map((p) => ({
          ...p,
          truck_index:
            p.truck_index !== null && p.truck_index > i
              ? p.truck_index - 1
              : p.truck_index,
        }))
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

      const duplicates = await checkDuplicate(vals.dot, vals.ein);
      if (duplicates.length > 0) {
        toast({
          title: "Possível duplicata encontrada",
          description: duplicates.join(". "),
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

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

  // ============ TEMPLATE SELECTION ============
  if (!templateSelected) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <div className="relative overflow-hidden rounded-3xl aurora-bg p-8 sm:p-10">
          <div className="absolute inset-0 grid-pattern opacity-40" />
          <div className="absolute inset-0 noise-overlay" />
          <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

          <div className="relative text-center">
            <button
              onClick={() => navigate("/clients")}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/10 border border-white/15 backdrop-blur-md text-white text-xs font-semibold hover:bg-white/15 transition-all mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-5">
              <Sparkles className="w-3.5 h-3.5 text-white/80" />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Onboarding em 5 passos
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold gradient-text leading-tight">
              Novo Cliente
            </h1>
            <p className="text-white/70 mt-3 text-base sm:text-lg max-w-xl mx-auto">
              Escolha um template para começar. Você poderá personalizar tudo ao longo do
              fluxo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {serviceTemplates.map((tmpl) => (
            <button
              key={tmpl.name}
              onClick={() => applyTemplate(tmpl.services)}
              className="group relative text-left overflow-hidden rounded-3xl bg-card border border-border/50 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <div
                className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${tmpl.gradient} opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`}
              />
              <div className="relative flex items-start justify-between mb-5">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tmpl.gradient} flex items-center justify-center shadow-lg`}
                >
                  <tmpl.icon className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
              </div>
              <div className="relative">
                <h3 className="font-display font-bold text-xl mb-1">{tmpl.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{tmpl.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tmpl.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center h-6 px-2.5 rounded-md text-[11px] font-bold bg-gradient-to-r ${tmpl.gradient} text-white shadow-sm`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ============ WIZARD ============
  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Hero + Stepper */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

        <div className="relative">
          <button
            onClick={() => navigate("/clients")}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/10 border border-white/15 backdrop-blur-md text-white text-xs font-semibold hover:bg-white/15 transition-all mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </button>

          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.2em] mb-1">
                Passo {step + 1} de {steps.length}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
                {currentStep.label}
              </h1>
            </div>
          </div>

          {/* Stepper */}
          <div className="relative">
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-white/10" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-white/80 to-white/40 transition-all duration-500"
              style={{ width: `calc((100% - 40px) * ${step / (steps.length - 1)})` }}
            />
            <div className="relative flex justify-between">
              {steps.map((s, i) => {
                const isActive = i === step;
                const isDone = i < step;
                const Icon = s.icon;
                return (
                  <button
                    key={i}
                    onClick={() => i <= step && setStep(i)}
                    disabled={i > step}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isActive
                          ? `bg-gradient-to-br ${s.gradient} shadow-xl ring-4 ring-white/20 scale-110`
                          : isDone
                          ? "bg-white/90 text-[#0b0d2e]"
                          : "bg-white/10 border border-white/20 text-white/50"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? "text-white" : ""
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`hidden sm:block text-[11px] font-semibold tracking-wider ${
                        isActive
                          ? "text-white"
                          : isDone
                          ? "text-white/80"
                          : "text-white/40"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Step Card */}
      <div className="glass-card-premium rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${currentStep.gradient}`}
        />

        <div className="flex items-center gap-3 mb-6">
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${currentStep.gradient} flex items-center justify-center shadow-md`}
          >
            <StepIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">{currentStep.label}</h2>
            <p className="text-xs text-muted-foreground">
              {step === 0 && "Informações básicas da empresa"}
              {step === 1 && "Selecione os serviços ativos"}
              {step === 2 && "Cadastre a frota (opcional)"}
              {step === 3 && "Adicione os permits (opcional)"}
              {step === 4 && "Confira os dados antes de finalizar"}
            </p>
          </div>
        </div>

        {/* Step 0: Client Info */}
        {step === 0 && (
          <Form {...form}>
            <div className="space-y-5">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nome da Empresa *
                    </FormLabel>
                    <FormControl>
                      <div className="relative input-glow rounded-xl">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Ex: Martins Transportes LLC"
                          className="h-12 pl-10 rounded-xl bg-muted/40 border-border/60 focus:bg-background"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registration_responsible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Responsável pelo Cadastro
                    </FormLabel>
                    <FormControl>
                      <div className="relative input-glow rounded-xl">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Nome do responsável"
                          className="h-12 pl-10 rounded-xl bg-muted/40 border-border/60 focus:bg-background"
                          {...field}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Telefone
                      </FormLabel>
                      <FormControl>
                        <div className="relative input-glow rounded-xl">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="(555) 123-4567"
                            className="h-12 pl-10 rounded-xl bg-muted/40 border-border/60 focus:bg-background"
                            {...field}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative input-glow rounded-xl">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="email@empresa.com"
                            className="h-12 pl-10 rounded-xl bg-muted/40 border-border/60 focus:bg-background"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Endereço
                    </FormLabel>
                    <FormControl>
                      <div className="relative input-glow rounded-xl">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Endereço completo"
                          className="h-12 pl-10 rounded-xl bg-muted/40 border-border/60 focus:bg-background"
                          {...field}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* DOT lookup highlight card */}
              <div className="rounded-2xl bg-gradient-to-br from-indigo-500/5 via-primary/5 to-violet-500/5 border border-primary/15 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg btn-gradient flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Busca FMCSA</p>
                    <p className="text-[11px] text-muted-foreground">
                      Informe o DOT e puxamos os dados automaticamente
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="dot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          DOT #
                        </FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <div className="relative input-glow rounded-xl flex-1">
                              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <Input
                                placeholder="USDOT Number"
                                className="h-11 pl-9 rounded-xl bg-background border-border/60"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <Button
                            type="button"
                            onClick={handleDotLookup}
                            disabled={lookingUp}
                            className="h-11 px-3 btn-gradient text-white border-0 rounded-xl"
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
                        <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          MC #
                        </FormLabel>
                        <FormControl>
                          <div className="relative input-glow rounded-xl">
                            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              placeholder="MC Number"
                              className="h-11 pl-9 rounded-xl bg-background border-border/60"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ein"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          EIN
                        </FormLabel>
                        <FormControl>
                          <div className="relative input-glow rounded-xl">
                            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              placeholder="XX-XXXXXXX"
                              className="h-11 pl-9 rounded-xl bg-background border-border/60"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Observações
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Notas sobre o cliente..."
                        className="rounded-xl bg-muted/40 border-border/60 focus:bg-background"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </Form>
        )}

        {/* Step 1: Services */}
        {step === 1 && (
          <div>
            <p className="text-sm text-muted-foreground mb-5">
              Selecione os serviços que este cliente utiliza. Você pode alterar depois.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {services.map((s) => {
                const active = selectedServices[s.key];
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() =>
                      setSelectedServices({
                        ...selectedServices,
                        [s.key]: !active,
                      })
                    }
                    className={`group relative overflow-hidden rounded-2xl p-4 text-left transition-all ${
                      active
                        ? `bg-gradient-to-br ${s.gradient} shadow-xl scale-[1.02] text-white`
                        : "bg-muted/40 border border-border/60 hover:border-primary/40 hover:bg-muted/60"
                    }`}
                  >
                    {active && (
                      <div className="absolute top-3 right-3">
                        <div className="w-6 h-6 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                    <div
                      className={`font-display text-2xl font-bold tracking-tight mb-1 ${
                        active ? "text-white" : "text-foreground"
                      }`}
                    >
                      {s.label}
                    </div>
                    <div
                      className={`text-xs ${
                        active ? "text-white/80" : "text-muted-foreground"
                      }`}
                    >
                      {s.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Trucks */}
        {step === 2 && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Adicione os caminhões da frota. Este passo é opcional.
            </p>

            {trucks.length > 0 && (
              <div className="space-y-2">
                {trucks.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md flex-shrink-0">
                      <Truck className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{t.plate}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[t.year, t.make, t.model].filter(Boolean).join(" ") ||
                          "Sem detalhes"}
                      </p>
                    </div>
                    <button
                      onClick={() => removeTruck(i)}
                      className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Adicionar caminhão
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Placa *"
                  value={truckDraft.plate}
                  onChange={(e) => setTruckDraft({ ...truckDraft, plate: e.target.value })}
                  className="h-11 rounded-xl bg-background"
                />
                <Input
                  placeholder="VIN"
                  value={truckDraft.vin}
                  onChange={(e) => setTruckDraft({ ...truckDraft, vin: e.target.value })}
                  className="h-11 rounded-xl bg-background"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Ano"
                  value={truckDraft.year}
                  onChange={(e) => setTruckDraft({ ...truckDraft, year: e.target.value })}
                  className="h-11 rounded-xl bg-background"
                />
                <Input
                  placeholder="Marca"
                  value={truckDraft.make}
                  onChange={(e) => setTruckDraft({ ...truckDraft, make: e.target.value })}
                  className="h-11 rounded-xl bg-background"
                />
                <Input
                  placeholder="Modelo"
                  value={truckDraft.model}
                  onChange={(e) => setTruckDraft({ ...truckDraft, model: e.target.value })}
                  className="h-11 rounded-xl bg-background"
                />
              </div>
              <Button
                type="button"
                onClick={addTruck}
                className="w-full h-11 btn-gradient text-white border-0 rounded-xl font-semibold"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar Caminhão
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Permits */}
        {step === 3 && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Adicione os permits do cliente. Este passo é opcional.
            </p>

            {permits.length > 0 && (
              <div className="space-y-2">
                {permits.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md flex-shrink-0">
                      <FileCheck className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {p.permit_type}
                        {p.permit_number && ` — ${p.permit_number}`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[
                          p.state && `Estado ${p.state}`,
                          p.truck_index !== null && `🚛 ${trucks[p.truck_index]?.plate}`,
                          p.expiration_date && `Venc ${p.expiration_date}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <button
                      onClick={() => removePermit(i)}
                      className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Adicionar permit
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={permitDraft.permit_type}
                  onValueChange={(v) => setPermitDraft({ ...permitDraft, permit_type: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-background">
                    <SelectValue placeholder="Tipo do permit *" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMIT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Nº do permit"
                  value={permitDraft.permit_number}
                  onChange={(e) =>
                    setPermitDraft({ ...permitDraft, permit_number: e.target.value })
                  }
                  className="h-11 rounded-xl bg-background"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Estado"
                  value={permitDraft.state}
                  onChange={(e) => setPermitDraft({ ...permitDraft, state: e.target.value })}
                  className="h-11 rounded-xl bg-background"
                />
                <Input
                  type="date"
                  value={permitDraft.expiration_date}
                  onChange={(e) =>
                    setPermitDraft({ ...permitDraft, expiration_date: e.target.value })
                  }
                  className="h-11 rounded-xl bg-background"
                />
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
                  <SelectTrigger className="h-11 rounded-xl bg-background">
                    <SelectValue placeholder="Caminhão" />
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
              <Button
                type="button"
                onClick={addPermit}
                className="w-full h-11 btn-gradient text-white border-0 rounded-xl font-semibold"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar Permit
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            {[
              {
                icon: Building2,
                title: "Empresa",
                gradient: "from-indigo-500 to-violet-500",
                content: (
                  <>
                    <p className="text-base font-bold">{form.getValues("company_name")}</p>
                    {form.getValues("registration_responsible") && (
                      <p className="text-sm text-muted-foreground">
                        Responsável: {form.getValues("registration_responsible")}
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs text-muted-foreground">
                      {form.getValues("email") && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3" />
                          {form.getValues("email")}
                        </div>
                      )}
                      {form.getValues("phone") && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3" />
                          {form.getValues("phone")}
                        </div>
                      )}
                      {form.getValues("dot") && <div>DOT {form.getValues("dot")}</div>}
                      {form.getValues("mc") && <div>MC {form.getValues("mc")}</div>}
                      {form.getValues("ein") && <div>EIN {form.getValues("ein")}</div>}
                    </div>
                  </>
                ),
              },
              {
                icon: Settings2,
                title: "Serviços",
                gradient: "from-sky-500 to-blue-500",
                content: (
                  <div className="flex flex-wrap gap-1.5">
                    {services.filter((s) => selectedServices[s.key]).length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Nenhum serviço selecionado
                      </span>
                    ) : (
                      services
                        .filter((s) => selectedServices[s.key])
                        .map((s) => (
                          <span
                            key={s.key}
                            className={`inline-flex items-center h-7 px-3 rounded-lg text-xs font-semibold bg-gradient-to-r ${s.gradient} text-white shadow-sm`}
                          >
                            {s.label}
                          </span>
                        ))
                    )}
                  </div>
                ),
              },
              {
                icon: Truck,
                title: `Caminhões (${trucks.length})`,
                gradient: "from-emerald-500 to-teal-500",
                content:
                  trucks.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Nenhum caminhão adicionado
                    </span>
                  ) : (
                    <div className="space-y-1">
                      {trucks.map((t, i) => (
                        <p key={i} className="text-sm">
                          <span className="font-semibold">{t.plate}</span>
                          {[t.year, t.make, t.model].filter(Boolean).length > 0 &&
                            ` — ${[t.year, t.make, t.model].filter(Boolean).join(" ")}`}
                        </p>
                      ))}
                    </div>
                  ),
              },
              {
                icon: FileCheck,
                title: `Permits (${permits.length})`,
                gradient: "from-amber-500 to-orange-500",
                content:
                  permits.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Nenhum permit adicionado
                    </span>
                  ) : (
                    <div className="space-y-1">
                      {permits.map((p, i) => (
                        <p key={i} className="text-sm">
                          <span className="font-semibold">{p.permit_type}</span>
                          {p.permit_number && ` #${p.permit_number}`}
                          {p.truck_index !== null &&
                            ` · ${trucks[p.truck_index]?.plate}`}
                        </p>
                      ))}
                    </div>
                  ),
              },
            ].map((card) => (
              <div
                key={card.title}
                className="relative overflow-hidden rounded-2xl bg-card border border-border/50 p-5"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`}
                />
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-md`}
                  >
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-sm">{card.title}</h3>
                </div>
                <div className="pl-12">{card.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={step === 0 ? () => navigate("/clients") : prevStep}
          className="h-11 px-5 rounded-xl bg-muted/60 hover:bg-muted border border-border/60 text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? "Cancelar" : "Voltar"}
        </button>
        {step < steps.length - 1 ? (
          <button
            onClick={nextStep}
            className="group h-11 px-6 btn-gradient text-white text-sm font-semibold rounded-xl inline-flex items-center gap-1.5 hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all relative overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            Próximo
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={saving}
            className="group h-11 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-[0_10px_30px_-8px_hsl(158_55%_42%/0.55)] text-white text-sm font-semibold rounded-xl inline-flex items-center gap-1.5 transition-all disabled:opacity-60 relative overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Finalizar Cadastro
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
