import { Check, Building2, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "@/contexts/OrgContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OrgSwitcherProps {
  collapsed?: boolean;
}

export function OrgSwitcher({ collapsed = false }: OrgSwitcherProps) {
  const { currentOrg, memberships, switchOrg, loading } = useOrg();

  // Single-org or pre-load: render nothing (sidebar branding stays as-is).
  if (loading || memberships.length <= 1 || !currentOrg) return null;

  return (
    <div className={cn("shrink-0 border-b border-sidebar-border/40", collapsed ? "px-2 py-1.5" : "px-3 py-2")}>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-2 rounded-md hover:bg-sidebar-accent/40 transition-colors",
            collapsed ? "justify-center p-1.5" : "px-2 py-1.5"
          )}
          title={collapsed ? currentOrg.name : undefined}
        >
          <Building2 className="w-4 h-4 text-sidebar-foreground/55 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 min-w-0 text-left text-[12px] font-medium text-sidebar-foreground truncate">
                {currentOrg.name}
              </span>
              <ChevronsUpDown className="w-3 h-3 text-sidebar-foreground/40 shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.organization.id}
            onClick={() => {
              if (m.organization.id !== currentOrg.id) {
                void switchOrg(m.organization.id);
              }
            }}
            className="flex items-center justify-between"
          >
            <span className="flex flex-col min-w-0">
              <span className="truncate text-[12px] font-medium">{m.organization.name}</span>
              <span className="text-[10px] text-muted-foreground capitalize">{m.role}</span>
            </span>
            {m.organization.id === currentOrg.id && (
              <Check className="w-3.5 h-3.5 text-sidebar-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}
