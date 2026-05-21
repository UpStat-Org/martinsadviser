import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  Truck,
  FileCheck,
  ClipboardList,
  CalendarDays,
  ShieldCheck,
  Fuel,
  MapPin,
  Receipt,
  BarChart3,
  DollarSign,
  Settings,
  Plus,
  Search,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClients } from "@/hooks/useClients";
import { useTrucks } from "@/hooks/useTrucks";
import { usePermits } from "@/hooks/usePermits";

/**
 * Global command palette. Mounted once at the AppLayout level. Opens on
 * Ctrl+K / Cmd+K from anywhere inside the protected shell. Lazy-fetches
 * top entities (clients/trucks/permits) so the search list is non-empty
 * even before the user starts typing.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: clients } = useClients();
  const { data: trucks } = useTrucks();
  const { data: permits } = usePermits();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const nav: Array<{ to: string; labelKey: string; icon: typeof Users }> = [
    { to: "/dashboard", labelKey: "cmdk.nav.dashboard", icon: LayoutDashboard },
    { to: "/clients", labelKey: "cmdk.nav.clients", icon: Users },
    { to: "/trucks", labelKey: "cmdk.nav.trucks", icon: Truck },
    { to: "/permits", labelKey: "cmdk.nav.permits", icon: FileCheck },
    { to: "/tasks", labelKey: "cmdk.nav.tasks", icon: ClipboardList },
    { to: "/calendar", labelKey: "cmdk.nav.calendar", icon: CalendarDays },
    { to: "/compliance-calendar", labelKey: "cmdk.nav.compliance", icon: CalendarDays },
    { to: "/drug-testing", labelKey: "cmdk.nav.drugTesting", icon: ShieldCheck },
    { to: "/ifta", labelKey: "cmdk.nav.ifta", icon: Fuel },
    { to: "/irp", labelKey: "cmdk.nav.irp", icon: MapPin },
    { to: "/hvut", labelKey: "cmdk.nav.hvut", icon: Receipt },
    { to: "/reports", labelKey: "cmdk.nav.reports", icon: BarChart3 },
    { to: "/finance", labelKey: "cmdk.nav.finance", icon: DollarSign },
    { to: "/settings", labelKey: "cmdk.nav.settings", icon: Settings },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t("cmdk.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("cmdk.empty")}</CommandEmpty>

        <CommandGroup heading={t("cmdk.group.actions")}>
          <CommandItem onSelect={() => go("/clients/onboarding")}>
            <Plus className="w-4 h-4 mr-2" />
            {t("cmdk.action.newClient")}
          </CommandItem>
          <CommandItem onSelect={() => go("/safer-lookup")}>
            <Search className="w-4 h-4 mr-2" />
            {t("cmdk.action.saferLookup")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("cmdk.group.nav")}>
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <CommandItem key={n.to} onSelect={() => go(n.to)}>
                <Icon className="w-4 h-4 mr-2" />
                {t(n.labelKey)}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {clients && clients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("cmdk.group.clients")}>
              {clients.slice(0, 8).map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.company_name} ${c.dot ?? ""} ${c.mc ?? ""}`}
                  onSelect={() => go(`/clients/${c.id}`)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {c.company_name}
                  {c.dot && <span className="ml-2 text-xs text-muted-foreground">DOT {c.dot}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {trucks && trucks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("cmdk.group.trucks")}>
              {trucks.slice(0, 8).map((tr) => (
                <CommandItem
                  key={tr.id}
                  value={`${tr.plate} ${tr.vin ?? ""}`}
                  onSelect={() => go(`/trucks/${tr.id}`)}
                >
                  <Truck className="w-4 h-4 mr-2" />
                  {tr.plate}
                  {tr.vin && <span className="ml-2 text-xs text-muted-foreground font-mono">{tr.vin}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {permits && permits.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("cmdk.group.permits")}>
              {permits.slice(0, 8).map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.permit_type} ${p.permit_number ?? ""}`}
                  onSelect={() => go(`/permits/${p.id}`)}
                >
                  <FileCheck className="w-4 h-4 mr-2" />
                  {p.permit_type}
                  {p.permit_number && <span className="ml-2 text-xs text-muted-foreground">#{p.permit_number}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
