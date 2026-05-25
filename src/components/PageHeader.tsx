import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Page title — left, bold, ~text-xl. */
  title: ReactNode;
  /** One-line description below the title, muted. */
  description?: ReactNode;
  /** Inline metadata chips/badges shown after the title on the same row. */
  meta?: ReactNode;
  /** Primary/secondary actions, top-right. */
  actions?: ReactNode;
  /** Optional row below the title — usually a tab bar or filter strip. */
  toolbar?: ReactNode;
  /** Optional eyebrow line above the title (breadcrumb, section name). */
  eyebrow?: ReactNode;
  className?: string;
}

/**
 * Standard header for every authenticated page. Sets the CRM rhythm: short,
 * dense, no decoration. Actions wrap on small screens; the toolbar sits on
 * its own row so filter bars don't fight with the title.
 */
export function PageHeader({
  title,
  description,
  meta,
  actions,
  toolbar,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            {meta && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {meta}
              </div>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {toolbar && <div className="mt-4">{toolbar}</div>}
    </header>
  );
}

/**
 * Standalone section header for grouping content inside a page. Use when a
 * page has multiple "subsections" that each need their own title row.
 */
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3 mb-3", className)}>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}
