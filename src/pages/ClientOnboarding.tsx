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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  Calendar as CalendarIcon,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { pt, enUS, es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCreateClient, useCheckClientDuplicate } from "@/hooks/useClients";
import { useCreateTruck } from "@/hooks/useTrucks";
import { useCreatePermit, PERMIT_TYPES } from "@/hooks/usePermits";
import { useToast } from "@/hooks/use-toast";
import { useFmcsaLookup } from "@/hooks/useFmcsaLookup";
import { useLanguage } from "@/contexts/LanguageContext";
import { tNow } from "@/lib/translations";

const dateLocales = { pt, en: enUS, es };

// --- Schemas ---
const clientSchema = z.object({
  company_name: z.string().min(1, tNow("clientForm.companyRequired")),
  registration_responsible: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email(tNow("clientForm.emailInvalid")).optional().or(z.literal("")),
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
  { icon: Building2, labelKey: "onboarding.companyData", gradient: "from-indigo-500 to-violet-500" },
  { icon: Settings2, labelKey: "onboarding.services", gradient: "from-sky-500 to-blue-500" },
  { icon: Truck, labelKey: "onboarding.trucksStep", gradient: "from-emerald-500 to-teal-500" },
  { icon: FileCheck, labelKey: "onboarding.permitsStep", gradient: "from-amber-500 to-orange-500" },
  { icon: CheckCircle2, labelKey: "onboarding.review", gradient: "from-fuchsia-500 to-pink-500" },
];

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
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
      toast({ title: t("onboarding.fmcsaLoaded"), description: t("onboarding.fillRemaining") });
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
      desc: t("onboarding.service.iftaOnly"),
      icon: Zap,
      gradient: "from-indigo-500 to-violet-500",
      tags: ["IFTA"],
      services: { service_ifta: true, service_ct: false, service_ny: false, service_kyu: false, service_nm: false, service_automatic: false },
    },
    {
      name: "CT + NY",
      desc: t("onboarding.service.ctNy"),
      icon: Layers,
      gradient: "from-blue-500 to-cyan-500",
      tags: ["CT", "NY"],
      services: { service_ifta: false, service_ct: true, service_ny: true, service_kyu: false, service_nm: false, service_automatic: false },
    },
    {
      name: "Full Compliance",
      desc: t("onboarding.service.full"),
      icon: Sparkles,
      gradient: "from-emerald-500 to-teal-500",
      tags: ["IFTA", "CT", "NY", "KYU", "NM", "Auto"],
      services: { service_ifta: true, service_ct: true, service_ny: true, service_kyu: true, service_nm: true, service_automatic: true },
    },
    {
      name: t("onboarding.service.custom"),
      desc: t("onboarding.service.customDesc"),
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
      toast({ title: t("onboarding.truckRequired"), variant: "destructive" });
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
      toast({ title: t("onboarding.permitTypeRequired"), variant: "destructive" });
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
    try {
      if (step === 0) {
        const valid = await form.trigger();
        if (!valid) {
          // Surface the first field error as a toast so the user gets feedback
          // even if the inline FormMessage is below the fold.
          const errors = form.formState.errors;
          const firstKey = Object.keys(errors)[0] as keyof typeof errors | undefined;
          const firstMsg = firstKey
            ? (errors[firstKey] as { message?: string } | undefined)?.message
            : undefined;
          toast({
            title: "Confira os campos",
            description: firstMsg ?? "Preencha os campos obrigatórios.",
            variant: "destructive",
          });
          return;
        }
      }
      setStep((s) => Math.min(s + 1, steps.length - 1));
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    setSaving(true);
    try {
      const vals = form.getValues();

      const duplicates = await checkDuplicate(vals.dot, vals.ein);
      if (duplicates.length > 0) {
        toast({
          title: t("onboarding.possibleDuplicate"),
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
        title: t("onboarding.saved"),
        description: t("onboarding.savedDesc"),
      });
      navigate(`/clients/${client.id}`);
    } catch {
      toast({
        title: t("onboarding.saveError"),
        description: t("onboarding.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ============ TEMPLATE SELECTION ============
  if (!templateSelected) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-md bg-card border border-border p-8 sm:p-10">

          <div className="relative text-center">
            <button
              onClick={() => navigate("/clients")}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-card border border-border text-foreground text-xs font-semibold hover:bg-white/15 transition-all mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t("common.back")}
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border mb-5">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("onboarding.stepsCount")}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
              {t("clients.new")}
            </h1>
            <p className="text-muted-foreground mt-3 text-base sm:text-lg max-w-xl mx-auto">
              {t("onboarding.templateIntro")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {serviceTemplates.map((tmpl) => (
            <button
              key={tmpl.name}
              onClick={() => applyTemplate(tmpl.services)}
              className="group relative text-left overflow-hidden rounded-md bg-card border border-border/50 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <div
                className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-secondary text-secondary-foreground border border-border opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`}
              />
              <div className="relative flex items-start justify-between mb-5">
                <div
                  className={`w-14 h-14 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center`}
                >
                  <tmpl.icon className="w-6 h-6 text-foreground" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
              </div>
              <div className="relative">
                <h3 className="font-bold text-xl mb-1">{tmpl.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{tmpl.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tmpl.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center h-6 px-2.5 rounded-md text-[11px] font-bold bg-secondary text-secondary-foreground border border-border text-foreground shadow-sm`}
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero + Stepper */}
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">

        <div className="relative">
          <button
            onClick={() => navigate("/clients")}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-card border border-border text-foreground text-xs font-semibold hover:bg-white/15 transition-all mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("common.back")}
          </button>

          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-1">
                {t("onboarding.step")} {step + 1} {t("common.of")} {steps.length}
              </p>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {t(currentStep.labelKey)}
              </h1>
            </div>
          </div>

          {/* Stepper */}
          <div className="relative">
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-white/10" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-secondary text-secondary-foreground border border-border transition-all duration-500"
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
                      className={`w-10 h-10 rounded-md flex items-center justify-center transition-all ${
                        isActive
                          ? `bg-secondary text-secondary-foreground border border-border shadow-xl ring-4 ring-white/20 scale-110`
                          : isDone
                          ? "bg-white/90 text-[#0b0d2e]"
                          : "bg-white/10 border border-border text-muted-foreground"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? "text-foreground" : ""
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`hidden sm:block text-[11px] font-semibold tracking-wider ${
                        isActive
                          ? "text-foreground"
                          : isDone
                          ? "text-muted-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {t(s.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Step Card */}
      <div className="glass-card-premium rounded-md p-6 sm:p-8 relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border`}
        />

        <div className="flex items-center gap-3 mb-6">
          <div
            className={`w-11 h-11 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center`}
          >
            <StepIcon className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t(currentStep.labelKey)}</h2>
            <p className="text-xs text-muted-foreground">
              {step === 0 && t("onboarding.basicInfo")}
              {step === 1 && t("onboarding.selectActiveServices")}
              {step === 2 && t("onboarding.fleetOptional")}
              {step === 3 && t("onboarding.permitsOptional")}
              {step === 4 && t("onboarding.reviewBeforeFinish")}
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
                      {t("onboarding.companyName")} *
                    </FormLabel>
                    <FormControl>
                      <div className="relative input-glow rounded-md">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder={t("common.companyExamplePlaceholder")}
                          className="h-12 pl-10 rounded-md bg-muted/40 border-border/60 focus:bg-background"
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
                      {t("onboarding.registrationResponsible")}
                    </FormLabel>
                    <FormControl>
                      <div className="relative input-glow rounded-md">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder={t("onboarding.registrationResponsiblePlaceholder")}
                          className="h-12 pl-10 rounded-md bg-muted/40 border-border/60 focus:bg-background"
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
                        {t("clients.phone")}
                      </FormLabel>
                      <FormControl>
                        <div className="relative input-glow rounded-md">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="(555) 123-4567"
                            className="h-12 pl-10 rounded-md bg-muted/40 border-border/60 focus:bg-background"
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
                        {t("login.email")}
                      </FormLabel>
                      <FormControl>
                        <div className="relative input-glow rounded-md">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder={t("common.emailPlaceholder")}
                            className="h-12 pl-10 rounded-md bg-muted/40 border-border/60 focus:bg-background"
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
                      {t("common.address")}
                    </FormLabel>
                    <FormControl>
                      <div className="relative input-glow rounded-md">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder={t("common.addressPlaceholder")}
                          className="h-12 pl-10 rounded-md bg-muted/40 border-border/60 focus:bg-background"
                          {...field}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* DOT lookup highlight card */}
              <div className="rounded-md bg-secondary text-secondary-foreground border border-border border border-primary/15 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t("onboarding.fmcsaLookup")}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("onboarding.fmcsaLookupDesc")}
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
                            <div className="relative input-glow rounded-md flex-1">
                              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <Input
                                placeholder={t("clients.dotPlaceholder")}
                                className="h-11 pl-9 rounded-md bg-background border-border/60"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <Button
                            type="button"
                            onClick={handleDotLookup}
                            disabled={lookingUp}
                            className="h-11 px-3 bg-primary text-primary-foreground hover:bg-primary/90 text-foreground border-0 rounded-md"
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
                          <div className="relative input-glow rounded-md">
                            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              placeholder={t("clients.mcPlaceholder")}
                              className="h-11 pl-9 rounded-md bg-background border-border/60"
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
                          <div className="relative input-glow rounded-md">
                            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              placeholder={t("common.einPlaceholder")}
                              className="h-11 pl-9 rounded-md bg-background border-border/60"
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
                      {t("clients.notes")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder={t("common.notesPlaceholder")}
                        className="rounded-md bg-muted/40 border-border/60 focus:bg-background"
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
              {t("onboarding.selectServicesHint")}
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
                    className={`group relative overflow-hidden rounded-md p-4 text-left transition-all ${
                      active
                        ? `bg-secondary text-secondary-foreground border border-border shadow-xl scale-[1.02] text-foreground`
                        : "bg-muted/40 border border-border/60 hover:border-primary/40 hover:bg-muted/60"
                    }`}
                  >
                    {active && (
                      <div className="absolute top-3 right-3">
                        <div className="w-6 h-6 rounded-full bg-card flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-secondary-foreground" />
                        </div>
                      </div>
                    )}
                    <div
                      className={`text-lg font-semibold tracking-tight mb-1 ${
                        active ? "text-foreground" : "text-foreground"
                      }`}
                    >
                      {s.label}
                    </div>
                    <div
                      className={`text-xs ${
                        active ? "text-muted-foreground" : "text-muted-foreground"
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
              {t("onboarding.trucksDesc")}
            </p>

            {trucks.length > 0 && (
              <div className="space-y-2">
                {trucks.map((truck, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-md bg-muted/40 border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center flex-shrink-0">
                      <Truck className="w-4 h-4 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{truck.plate}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[truck.year, truck.make, truck.model].filter(Boolean).join(" ") ||
                          t("onboarding.noTruckDetails")}
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

            <div className="rounded-md border-2 border-dashed border-border/60 bg-muted/20 p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t("onboarding.addTruckTitle")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder={`${t("trucks.plate")} *`}
                  value={truckDraft.plate}
                  onChange={(e) => setTruckDraft({ ...truckDraft, plate: e.target.value })}
                  className="h-11 rounded-md bg-background"
                />
                <Input
                  placeholder={t("trucks.vin")}
                  value={truckDraft.vin}
                  onChange={(e) => setTruckDraft({ ...truckDraft, vin: e.target.value })}
                  className="h-11 rounded-md bg-background"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder={t("trucks.year")}
                  value={truckDraft.year}
                  onChange={(e) => setTruckDraft({ ...truckDraft, year: e.target.value })}
                  className="h-11 rounded-md bg-background"
                />
                <Input
                  placeholder={t("trucks.make")}
                  value={truckDraft.make}
                  onChange={(e) => setTruckDraft({ ...truckDraft, make: e.target.value })}
                  className="h-11 rounded-md bg-background"
                />
                <Input
                  placeholder={t("trucks.model")}
                  value={truckDraft.model}
                  onChange={(e) => setTruckDraft({ ...truckDraft, model: e.target.value })}
                  className="h-11 rounded-md bg-background"
                />
              </div>
              <Button
                type="button"
                onClick={addTruck}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 text-foreground border-0 rounded-md font-semibold"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {t("onboarding.addTruck")}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Permits */}
        {step === 3 && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              {t("onboarding.permitsDesc")}
            </p>

            {permits.length > 0 && (
              <div className="space-y-2">
                {permits.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-md bg-muted/40 border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center flex-shrink-0">
                      <FileCheck className="w-4 h-4 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {p.permit_type}
                        {p.permit_number && ` — ${p.permit_number}`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[
                          p.state && `${t("onboarding.statePrefix")} ${p.state}`,
                          p.truck_index !== null && `🚛 ${trucks[p.truck_index]?.plate}`,
                          p.expiration_date &&
                            isValid(parseISO(p.expiration_date)) &&
                            `${t("onboarding.expPrefix")} ${format(parseISO(p.expiration_date), "dd MMM yyyy", { locale: dateLocales[language] })}`,
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

            <div className="rounded-md border-2 border-dashed border-border/60 bg-muted/20 p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t("onboarding.addPermitTitle")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={permitDraft.permit_type}
                  onValueChange={(v) => setPermitDraft({ ...permitDraft, permit_type: v })}
                >
                  <SelectTrigger className="h-11 rounded-md bg-background">
                    <SelectValue placeholder={`${t("common.type")} *`} />
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
                  placeholder={t("common.number")}
                  value={permitDraft.permit_number}
                  onChange={(e) =>
                    setPermitDraft({ ...permitDraft, permit_number: e.target.value })
                  }
                  className="h-11 rounded-md bg-background"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder={t("common.state")}
                  value={permitDraft.state}
                  onChange={(e) => setPermitDraft({ ...permitDraft, state: e.target.value })}
                  className="h-11 rounded-md bg-background"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-11 w-full justify-start text-left font-normal rounded-md bg-background",
                        !permitDraft.expiration_date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      {permitDraft.expiration_date && isValid(parseISO(permitDraft.expiration_date))
                        ? format(parseISO(permitDraft.expiration_date), "dd MMM yyyy", {
                            locale: dateLocales[language],
                          })
                        : t("common.expiration")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        permitDraft.expiration_date && isValid(parseISO(permitDraft.expiration_date))
                          ? parseISO(permitDraft.expiration_date)
                          : undefined
                      }
                      onSelect={(d) =>
                        setPermitDraft({
                          ...permitDraft,
                          expiration_date: d ? format(d, "yyyy-MM-dd") : "",
                        })
                      }
                      initialFocus
                      locale={dateLocales[language]}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
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
                  <SelectTrigger className="h-11 rounded-md bg-background">
                    <SelectValue placeholder={t("common.truck")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("common.none")}</SelectItem>
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
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 text-foreground border-0 rounded-md font-semibold"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {t("onboarding.addPermit")}
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
                title: t("onboarding.company"),
                gradient: "from-indigo-500 to-violet-500",
                content: (
                  <>
                    <p className="text-base font-bold">{form.getValues("company_name")}</p>
                    {form.getValues("registration_responsible") && (
                      <p className="text-sm text-muted-foreground">
                        {t("onboarding.registrationResponsible")}: {form.getValues("registration_responsible")}
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
                title: t("onboarding.services"),
                gradient: "from-sky-500 to-blue-500",
                content: (
                  <div className="flex flex-wrap gap-1.5">
                    {services.filter((s) => selectedServices[s.key]).length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {t("onboarding.noService")}
                      </span>
                    ) : (
                      services
                        .filter((s) => selectedServices[s.key])
                        .map((s) => (
                          <span
                            key={s.key}
                            className={`inline-flex items-center h-7 px-3 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground border border-border text-foreground shadow-sm`}
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
                title: `${t("onboarding.trucksStep")} (${trucks.length})`,
                gradient: "from-emerald-500 to-teal-500",
                content:
                  trucks.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {t("onboarding.noTrucksAdded")}
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
                title: `${t("onboarding.permitsStep")} (${permits.length})`,
                gradient: "from-amber-500 to-orange-500",
                content:
                  permits.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {t("onboarding.noPermitsAdded")}
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
                className="relative overflow-hidden rounded-md bg-card border border-border/50 p-5"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border`}
                />
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className={`w-9 h-9 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center`}
                  >
                    <card.icon className="w-4 h-4 text-foreground" />
                  </div>
                  <h3 className="font-bold text-sm">{card.title}</h3>
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
          type="button"
          onClick={step === 0 ? () => navigate("/clients") : prevStep}
          className="h-11 px-5 rounded-md bg-muted/60 hover:bg-muted border border-border/60 text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? t("common.cancel") : t("common.back")}
        </button>
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            className="group h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90 text-foreground text-sm font-semibold rounded-md inline-flex items-center gap-1.5 transition-all relative overflow-hidden"
          >
            <span className="pointer-events-none absolute inset-0 bg-secondary text-secondary-foreground border border-border -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative inline-flex items-center gap-1.5">
              {t("common.next")}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={saving}
            className="group h-11 px-6 bg-secondary text-secondary-foreground border border-border text-sm font-semibold rounded-md inline-flex items-center gap-1.5 transition-all disabled:opacity-60 relative overflow-hidden"
          >
            <span className="pointer-events-none absolute inset-0 bg-secondary text-secondary-foreground border border-border -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative inline-flex items-center gap-1.5">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("common.saving")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {t("onboarding.finishRegistration")}
                </>
              )}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
