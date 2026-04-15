import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Truck, FileCheck, DollarSign } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  type: "client" | "truck" | "permit" | "invoice";
  route: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const pattern = `%${q}%`;

    const results = await Promise.allSettled([
      supabase.from("clients").select("id, company_name, dot, mc").or(`company_name.ilike.${pattern},dot.ilike.${pattern},mc.ilike.${pattern},ein.ilike.${pattern}`).limit(5),
      supabase.from("trucks").select("id, plate, make, model, client_id").or(`plate.ilike.${pattern},vin.ilike.${pattern},make.ilike.${pattern}`).limit(5),
      supabase.from("permits").select("id, permit_type, permit_number, state, client_id").or(`permit_type.ilike.${pattern},permit_number.ilike.${pattern},state.ilike.${pattern}`).limit(5),
      supabase.from("invoices").select("id, description, client_id, amount, status").or(`description.ilike.${pattern},status.ilike.${pattern}`).limit(5),
    ]);
    const [clients, trucks, permits, invoices] = results.map((r) => r.status === "fulfilled" ? r.value : { data: null });

    const items: SearchResult[] = [
      ...(clients.data?.map((c) => ({ id: c.id, label: c.company_name, sublabel: [c.dot && `DOT ${c.dot}`, c.mc && `MC ${c.mc}`].filter(Boolean).join(" • "), type: "client" as const, route: `/clients/${c.id}` })) || []),
      ...(trucks.data?.map((t) => ({ id: t.id, label: t.plate, sublabel: [t.make, t.model].filter(Boolean).join(" "), type: "truck" as const, route: `/clients/${t.client_id}` })) || []),
      ...(permits.data?.map((p) => ({ id: p.id, label: `${p.permit_type}${p.state ? ` - ${p.state}` : ""}`, sublabel: p.permit_number || undefined, type: "permit" as const, route: `/clients/${p.client_id}` })) || []),
      ...(invoices.data?.map((i) => ({ id: i.id, label: i.description || `$${i.amount}`, sublabel: i.status, type: "invoice" as const, route: `/finance` })) || []),
    ];

    setResults(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 300);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const handleSelect = (route: string) => {
    setOpen(false);
    setQuery("");
    navigate(route);
  };

  const icons = { client: Users, truck: Truck, permit: FileCheck, invoice: DollarSign };
  const labels = { client: t("nav.clients"), truck: t("nav.trucks"), permit: t("nav.permits"), invoice: t("nav.finance") };
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

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
          ⌘K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-2xl rounded-2xl border-border/60 max-w-xl">
          <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.15em] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input-wrapper]_svg]:text-primary [&_[cmdk-input]]:h-14 [&_[cmdk-input]]:text-base [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:gap-3 [&_[cmdk-item][data-selected=true]]:bg-accent">
            <CommandInput placeholder={t("search.placeholder")} value={query} onValueChange={setQuery} />
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
                        : query.length >= 2
                        ? t("search.noResults")
                        : t("search.typeToSearch")}
                    </span>
                  </div>
                </CommandEmpty>
              )}
              {Object.entries(grouped).map(([type, items]) => {
                const Icon = icons[type as keyof typeof icons];
                const iconGradient = {
                  client: "from-indigo-500 to-violet-500",
                  truck: "from-blue-500 to-cyan-500",
                  permit: "from-emerald-500 to-teal-500",
                  invoice: "from-amber-500 to-orange-500",
                }[type as keyof typeof icons];
                return (
                  <CommandGroup key={type} heading={labels[type as keyof typeof labels]}>
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
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
                        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border/80 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100">
                          ↵
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
                  navegar
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="h-4 px-1 rounded bg-background border border-border font-mono text-[10px]">↵</kbd>
                  abrir
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="h-4 px-1 rounded bg-background border border-border font-mono text-[10px]">esc</kbd>
                  fechar
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
