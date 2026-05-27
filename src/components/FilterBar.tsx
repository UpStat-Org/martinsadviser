import type { ReactNode } from "react";
import { Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Filter chip groups, dividers, etc. */
  children?: ReactNode;
  /** Toolbar items pinned to the right (saved views, density, columns). */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Standard filter bar used by list pages (Clients, Permits, ...). Hosts the
 * search input plus arbitrary chip groups, with a consistent surface, padding,
 * and divider rhythm. Stack vertically on mobile, row on desktop.
 */
export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children,
  trailing,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-card border border-border/60 p-3 flex flex-col md:flex-row items-stretch md:items-center gap-3",
        className,
      )}
    >
      <div className="relative flex-1 md:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          className="pl-9 h-9 bg-muted/40 border-border/60 focus:bg-background rounded-md transition-colors"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {children}
      {trailing && <div className="md:ml-auto flex items-center gap-2">{trailing}</div>}
    </div>
  );
}

interface FilterChipGroupProps {
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FilterChipGroup({ label, children, className }: FilterChipGroupProps) {
  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {label && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
          <Filter className="w-3.5 h-3.5" />
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

interface FilterChipProps {
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FilterChip({ active, onClick, icon, children, className }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-8 px-3 rounded-md text-xs font-semibold transition-colors inline-flex items-center gap-1.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        active
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

interface FilterClearChipProps {
  onClick: () => void;
  children: ReactNode;
}

export function FilterClearChip({ onClick, children }: FilterClearChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 px-2.5 rounded-md text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/15 inline-flex items-center gap-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-1 focus-visible:ring-offset-background",
      )}
    >
      <X className="w-3 h-3" />
      {children}
    </button>
  );
}

export function FilterDivider() {
  return <div className="hidden md:block h-8 w-px bg-border/60" />;
}
