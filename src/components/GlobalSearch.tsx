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

    const [clients, trucks, permits, invoices] = await Promise.all([
      supabase.from("clients").select("id, company_name, dot, mc").or(`company_name.ilike.${pattern},dot.ilike.${pattern},mc.ilike.${pattern},ein.ilike.${pattern}`).limit(5),
      supabase.from("trucks").select("id, plate, make, model, client_id").or(`plate.ilike.${pattern},vin.ilike.${pattern},make.ilike.${pattern}`).limit(5),
      supabase.from("permits").select("id, permit_type, permit_number, state, client_id").or(`permit_type.ilike.${pattern},permit_number.ilike.${pattern},state.ilike.${pattern}`).limit(5),
      supabase.from("invoices").select("id, description, client_id, amount, status").or(`description.ilike.${pattern},status.ilike.${pattern}`).limit(5),
    ]);

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
        className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background text-muted-foreground text-sm hover:bg-accent transition-colors w-full max-w-sm"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">{t("search.placeholder")}</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-lg">
          <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            <CommandInput placeholder={t("search.placeholder")} value={query} onValueChange={setQuery} />
            <CommandList>
              {results.length === 0 && (
                <CommandEmpty>
                  {loading ? t("common.loading") : query.length >= 2 ? t("search.noResults") : t("search.typeToSearch")}
                </CommandEmpty>
              )}
              {Object.entries(grouped).map(([type, items]) => {
                const Icon = icons[type as keyof typeof icons];
                return (
                  <CommandGroup key={type} heading={labels[type as keyof typeof labels]}>
                    {items.map((item) => (
                      <CommandItem key={item.id} value={item.id} onSelect={() => handleSelect(item.route)} className="gap-3">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.sublabel && <span className="text-xs text-muted-foreground">{item.sublabel}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
