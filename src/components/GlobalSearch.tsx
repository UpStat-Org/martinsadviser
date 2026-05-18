import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  Truck,
  FileCheck,
  DollarSign,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

type SearchType = "all" | "client" | "truck" | "permit" | "invoice";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  type: Exclude<SearchType, "all">;
  route: string;
}

interface ClientRow {
  id: string;
  company_name: string;
  dot: string | null;
  mc: string | null;
}

interface TruckRow {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  vin?: string | null;
  client_id: string;
}

interface PermitRow {
  id: string;
  permit_type: string;
  permit_number: string | null;
  state: string | null;
  client_id: string;
}

interface InvoiceRow {
  id: string;
  description: string | null;
  client_id: string;
  amount: number;
  status: string;
}

function sanitizeSearch(value: string): string {
  return value.trim().replace(/[,%().*\\]/g, "");
}

function orIlike(fields: string[], value: string) {
  const pattern = `%${value}%`;
  return fields.map((field) => `${field}.ilike.${pattern}`).join(",");
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<SearchType>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const search = useCallback(async (rawQuery: string) => {
    const safe = sanitizeSearch(rawQuery);
    if (safe.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const shouldSearch = (type: SearchType) =>
      activeType === "all" || activeType === type;

    const settled = await Promise.allSettled([
      shouldSearch("client")
        ? supabase
            .from("clients")
            .select("id, company_name, dot, mc")
            .or(orIlike(["company_name", "dot", "mc", "ein"], safe))
            .limit(6)
        : Promise.resolve({ data: [] as ClientRow[] }),
      shouldSearch("truck")
        ? supabase
            .from("trucks")
            .select("id, plate, make, model, vin, client_id")
            .or(orIlike(["plate", "vin", "make", "model"], safe))
            .limit(6)
        : Promise.resolve({ data: [] as TruckRow[] }),
      shouldSearch("permit")
        ? supabase
            .from("permits")
            .select("id, permit_type, permit_number, state, client_id")
            .or(orIlike(["permit_type", "permit_number", "state"], safe))
            .limit(6)
        : Promise.resolve({ data: [] as PermitRow[] }),
      shouldSearch("invoice")
        ? supabase
            .from("invoices")
            .select("id, description, client_id, amount, status")
            .or(orIlike(["description", "status"], safe))
            .limit(6)
        : Promise.resolve({ data: [] as InvoiceRow[] }),
    ]);

    const [clients, trucks, permits, invoices] = settled.map((result) =>
      result.status === "fulfilled" ? result.value : { data: [] }
    ) as [
      { data: ClientRow[] | null },
      { data: TruckRow[] | null },
      { data: PermitRow[] | null },
      { data: InvoiceRow[] | null },
    ];

    const items: SearchResult[] = [
      ...(clients.data?.map((client) => ({
        id: client.id,
        label: client.company_name,
        sublabel: [client.dot && `DOT ${client.dot}`, client.mc && `MC ${client.mc}`]
          .filter(Boolean)
          .join(" • "),
        type: "client" as const,
        route: `/clients/${client.id}`,
      })) || []),
      ...(trucks.data?.map((truck) => ({
        id: truck.id,
        label: truck.plate,
        sublabel: [truck.make, truck.model, truck.vin && `VIN ${truck.vin}`]
          .filter(Boolean)
          .join(" • "),
        type: "truck" as const,
        route: `/trucks/${truck.id}`,
      })) || []),
      ...(permits.data?.map((permit) => ({
        id: permit.id,
        label: `${permit.permit_type}${permit.state ? ` - ${permit.state}` : ""}`,
        sublabel: permit.permit_number || undefined,
        type: "permit" as const,
        route: `/permits/${permit.id}`,
      })) || []),
      ...(invoices.data?.map((invoice) => ({
        id: invoice.id,
        label: invoice.description || `$${Number(invoice.amount).toFixed(2)}`,
        sublabel: invoice.status,
        type: "invoice" as const,
        route: `/finance/${invoice.id}`,
      })) || []),
    ];

    setResults(items);
    setLoading(false);
  }, [activeType]);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 250);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const handleSelect = (route: string) => {
    setOpen(false);
    setQuery("");
    navigate(route);
  };

  const typeOptions: { value: SearchType; label: string; icon: LucideIcon }[] = [
    { value: "all", label: t("search.all"), icon: Search },
    { value: "client", label: t("nav.clients"), icon: Users },
    { value: "truck", label: t("nav.trucks"), icon: Truck },
    { value: "permit", label: t("nav.permits"), icon: FileCheck },
    { value: "invoice", label: t("nav.finance"), icon: DollarSign },
  ];

  const icons: Record<SearchResult["type"], LucideIcon> = {
    client: Users,
    truck: Truck,
    permit: FileCheck,
    invoice: DollarSign,
  };

  const labels: Record<SearchResult["type"], string> = {
    client: t("nav.clients"),
    truck: t("nav.trucks"),
    permit: t("nav.permits"),
    invoice: t("nav.finance"),
  };

  const grouped = useMemo(
    () =>
      results.reduce<Record<string, SearchResult[]>>((acc, result) => {
        (acc[result.type] ??= []).push(result);
        return acc;
      }, {}),
    [results]
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative flex items-center gap-2.5 h-10 px-3.5 rounded-xl bg-muted/50 hover:bg-muted border border-border/60 hover:border-border text-muted-foreground text-sm transition-all w-full max-w-md shadow-sm hover:shadow-md"
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 group-hover:from-primary/25 group-hover:to-primary/10 transition-colors">
          <Search className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="flex-1 text-left font-medium">{t("search.placeholder")}</span>
        <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded-md border border-border/80 bg-background/80 px-1.5 font-mono text-[10px] font-semibold text-muted-foreground shadow-sm">
          Ctrl K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-2xl rounded-2xl border-border/60 max-w-xl">
          <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.15em] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input-wrapper]_svg]:text-primary [&_[cmdk-input]]:h-14 [&_[cmdk-input]]:text-base [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:gap-3 [&_[cmdk-item][data-selected=true]]:bg-accent">
            <CommandInput
              placeholder={t("search.placeholder")}
              value={query}
              onValueChange={setQuery}
            />

            <div className="px-3 pb-2 flex flex-wrap gap-1.5 border-b border-border/60">
              {typeOptions.map((option) => {
                const Icon = option.icon;
                const active = activeType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActiveType(option.value)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <CommandList className="max-h-[440px] p-1">
              {results.length === 0 && (
                <CommandEmpty className="py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-12 h-12 rounded-2xl bg-muted/70 flex items-center justify-center">
                      <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span>
                      {loading
                        ? t("common.loading")
                        : sanitizeSearch(query).length >= 2
                        ? t("search.noResults")
                        : t("search.typeToSearch")}
                    </span>
                  </div>
                </CommandEmpty>
              )}
              {Object.entries(grouped).map(([type, items]) => {
                const Icon = icons[type as SearchResult["type"]];
                const iconGradient = {
                  client: "from-indigo-500 to-violet-500",
                  truck: "from-blue-500 to-cyan-500",
                  permit: "from-emerald-500 to-teal-500",
                  invoice: "from-amber-500 to-orange-500",
                }[type as SearchResult["type"]];
                return (
                  <CommandGroup key={type} heading={labels[type as SearchResult["type"]]}>
                    {items.map((item) => (
                      <CommandItem
                        key={`${item.type}-${item.id}`}
                        value={`${item.type}-${item.id}`}
                        onSelect={() => handleSelect(item.route)}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${iconGradient} flex items-center justify-center shadow-sm flex-shrink-0`}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-semibold truncate">{item.label}</span>
                          {item.sublabel && (
                            <span className="text-xs text-muted-foreground truncate">
                              {item.sublabel}
                            </span>
                          )}
                        </div>
                        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border/80 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                          Enter
                        </kbd>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
            <div className="border-t border-border/60 px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="h-4 px-1 rounded bg-background border border-border font-mono text-[10px]">↑↓</kbd>
                  {t("search.navigate")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="h-4 px-1 rounded bg-background border border-border font-mono text-[10px]">Enter</kbd>
                  {t("search.open")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="h-4 px-1 rounded bg-background border border-border font-mono text-[10px]">esc</kbd>
                  {t("search.close")}
                </span>
              </div>
              <span className="font-semibold text-primary">MartinsAdviser</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
