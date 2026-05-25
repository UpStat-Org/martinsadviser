import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

/**
 * Initial-render loading screen. Shown by HomeIndex while the auth/org
 * state resolves and on any other gate that hits "loading". Intentionally
 * boring — a small wordmark, a tiny spinner, no animation theater.
 */
export function TruckLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo className="w-10 h-10 rounded" />
        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
      </div>
    </div>
  );
}
