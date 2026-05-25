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
import { cn } from "@/lib/utils";

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

  const queryTooShort = sanitizeSearch(query).length < 2;
  const emptyMessage = loading
    ? t("common.loading")
    : queryTooShort
    ? t("search.typeToSearch")
    : t("search.noResults");

  return (
    <>
      {/* Trigger button — flat, single neutral surface, no gradient halo */}
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2.5 h-9 px-3 rounded-md border border-border bg-card hover:bg-muted text-muted-foreground text-sm transition-colors w-full max-w-md"
      >
        <Search className="w-4 h-4 text-muted-foreground/70 shrink-0" />
        <span className="flex-1 text-left">{t("search.placeholder")}</span>
        <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-2xl gap-0">
          <Command
            shouldFilter={false}
            // The cmdk primitive ships with several CSS hooks we have to
            // override piecewise — pulling them into one className keeps
            // the markup readable.
            className={cn(
              // input
              "[&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-border",
              "[&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input-wrapper]_svg]:text-muted-foreground/70",
              "[&_[cmdk-input]]:h-12 [&_[cmdk-input]]:text-sm [&_[cmdk-input]]:placeholder:text-muted-foreground",
              // group heading
              "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-2",
              "[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider",
              "[&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground/80",
              // group spacing
              "[&_[cmdk-group]]:px-1.5 [&_[cmdk-group]+[cmdk-group]]:pt-1",
              // item
              "[&_[cmdk-item]]:px-2.5 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]]:rounded-md [&_[cmdk-item]]:gap-3",
              "[&_[cmdk-item][data-selected=true]]:bg-muted",
              "[&_[cmdk-item]]:cursor-pointer",
            )}
          >
            <CommandInput
              placeholder={t("search.placeholder")}
              value={query}
              onValueChange={setQuery}
            />

            {/* Type filter — own row with breathing room, separated from input */}
            <div className="px-3 py-2.5 border-b border-border bg-muted/30 flex flex-wrap items-center gap-1.5">
              {typeOptions.map((option) => {
                const Icon = option.icon;
                const active = activeType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActiveType(option.value)}
                    className={cn(
                      "h-7 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <CommandList className="max-h-[420px] py-2">
              {results.length === 0 && (
                <CommandEmpty className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center px-6">
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                      <Search className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xs">{emptyMessage}</p>
                  </div>
                </CommandEmpty>
              )}

              {Object.entries(grouped).map(([type, items]) => {
                const Icon = icons[type as SearchResult["type"]];
                return (
                  <CommandGroup key={type} heading={labels[type as SearchResult["type"]]}>
                    {items.map((item) => (
                      <CommandItem
                        key={`${item.type}-${item.id}`}
                        value={`${item.type}-${item.id}`}
                        onSelect={() => handleSelect(item.route)}
                      >
                        <div className="w-8 h-8 rounded-md bg-muted border border-border flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground truncate">
                            {item.label}
                          </span>
                          {item.sublabel && (
                            <span className="text-xs text-muted-foreground truncate font-mono mt-0.5">
                              {item.sublabel}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>

            {/* Footer — single row, evenly spaced shortcuts */}
            <div className="border-t border-border px-4 py-2.5 flex items-center gap-5 text-[11px] text-muted-foreground bg-muted/30">
              <span className="inline-flex items-center gap-1.5">
                <kbd className="h-4 px-1.5 rounded bg-card border border-border font-mono text-[10px] leading-none flex items-center">
                  ↑↓
                </kbd>
                {t("search.navigate")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="h-4 px-1.5 rounded bg-card border border-border font-mono text-[10px] leading-none flex items-center">
                  ↵
                </kbd>
                {t("search.open")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="h-4 px-1.5 rounded bg-card border border-border font-mono text-[10px] leading-none flex items-center">
                  Esc
                </kbd>
                {t("search.close")}
              </span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
