import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-10 sm:p-16 text-center">
        <div className="w-20 h-20 rounded-3xl bg-muted/70 border border-border/60 flex items-center justify-center mx-auto mb-5">
          {icon}
        </div>
        <p className="font-display text-lg font-semibold text-foreground mb-1">
          {title}
        </p>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          {description}
        </p>
        {(action || secondaryAction) && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {action}
            {secondaryAction}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
