/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Tonal status pill. Replaces ad-hoc `bg-emerald-500/10 text-emerald-600
 * dark:text-emerald-400 border-emerald-500/20` strings sprinkled across the
 * app. Uses the design tokens (`success`, `warning`, `destructive`, `primary`,
 * `muted`) so dark mode and per-tenant branding flow through automatically.
 */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-4 whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground border-border",
        success: "bg-success/10 text-success border-success/25",
        warning: "bg-warning/10 text-warning border-warning/30",
        danger: "bg-destructive/10 text-destructive border-destructive/25",
        info: "bg-primary/10 text-primary border-primary/25",
        outline: "bg-transparent text-foreground border-border",
      },
      size: {
        sm: "h-5 text-[10px] px-1.5",
        md: "h-6 text-[11px] px-2",
        lg: "h-7 text-xs px-2.5",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
    },
  },
);

export type StatusTone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ tone, size, className, children }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone, size }), className)}>
      {children}
    </span>
  );
}

export { statusBadgeVariants };
