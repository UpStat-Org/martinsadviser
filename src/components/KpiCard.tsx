import type { ComponentType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type KpiTone = "neutral" | "warning" | "danger" | "success";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  tone?: KpiTone;
  loading?: boolean;
  hint?: ReactNode;
  onClick?: () => void;
  className?: string;
}

const TONE_BAR: Record<KpiTone, string | null> = {
  neutral: null,
  warning: "bg-warning",
  danger: "bg-destructive",
  success: "bg-success",
};

const BASE_CARD =
  "relative rounded-md border border-border bg-card p-3.5 overflow-hidden transition-colors";

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  loading,
  hint,
  onClick,
  className,
}: KpiCardProps) {
  const toneBar = TONE_BAR[tone];
  const interactive = !!onClick;

  const content = (
    <>
      {toneBar && (
        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", toneBar)} />
      )}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon
          className={cn(
            "w-4 h-4 text-muted-foreground/70 transition-colors",
            interactive && "group-hover:text-foreground",
          )}
        />
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16 mt-2" />
      ) : (
        <div className="text-2xl font-semibold tracking-tight tabular mt-1.5">
          {value}
        </div>
      )}
      {hint && (
        <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
      )}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          BASE_CARD,
          "group text-left hover:bg-muted/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={cn(BASE_CARD, className)}>{content}</div>;
}
