import { Bell, FileWarning, Receipt, ListTodo, CheckCheck, Sparkles, BellOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const typeConfig: Record<
  string,
  { icon: typeof Bell; gradient: string; label: string; ring: string }
> = {
  permit_expiring: {
    icon: FileWarning,
    gradient: "from-amber-500 to-orange-500",
    ring: "ring-amber-500/20",
    label: "Permit",
  },
  permit_expired: {
    icon: FileWarning,
    gradient: "from-red-500 to-rose-500",
    ring: "ring-red-500/20",
    label: "Permit",
  },
  invoice_overdue: {
    icon: Receipt,
    gradient: "from-red-500 to-pink-500",
    ring: "ring-red-500/20",
    label: "Fatura",
  },
  task_stale: {
    icon: ListTodo,
    gradient: "from-orange-500 to-amber-500",
    ring: "ring-orange-500/20",
    label: "Tarefa",
  },
};

export function NotificationCenter() {
  const { data: notifications, unreadCount, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-xl hover:bg-muted transition-all"
        >
          <Bell
            className={cn(
              "h-5 w-5 transition-colors",
              unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
            )}
          />
          {unreadCount > 0 && (
            <>
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-br from-destructive to-rose-500 ring-2 ring-background" />
              </span>
              <span className="sr-only">{unreadCount} não lidas</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[420px] p-0 rounded-2xl shadow-2xl border-border/60 overflow-hidden"
        align="end"
        sideOffset={12}
      >
        {/* Gradient header */}
        <div className="relative overflow-hidden aurora-bg px-5 py-4">
          <div className="absolute inset-0 grid-pattern opacity-30" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center">
                <Bell className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Notificações</h3>
                <p className="text-[11px] text-white/70">
                  {unreadCount > 0
                    ? `${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}`
                    : "Você está em dia"}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs text-white hover:text-white hover:bg-white/15 rounded-lg font-semibold"
                onClick={() => markAllRead.mutate()}
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[440px]">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted/60 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !notifications?.length ? (
            <div className="p-10 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Sparkles className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Tudo em dia! 🎉</p>
              <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                Você não tem nenhuma notificação pendente. Volte mais tarde para novidades.
              </p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((n) => {
                const config =
                  typeConfig[n.type] ?? {
                    icon: Bell,
                    gradient: "from-slate-500 to-zinc-500",
                    ring: "ring-slate-500/20",
                    label: "Info",
                  };
                const Icon = config.icon;
                return (
                  <button
                    key={n.id}
                    className={cn(
                      "group w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all relative",
                      !n.read ? "bg-primary/[0.04] hover:bg-primary/[0.08]" : "hover:bg-muted/60"
                    )}
                    onClick={() => !n.read && markRead.mutate(n.id)}
                  >
                    {!n.read && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-primary to-purple-500" />
                    )}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm flex-shrink-0 ring-4",
                        config.gradient,
                        config.ring
                      )}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground leading-snug">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="mt-1 flex-shrink-0 inline-flex items-center px-1.5 h-4 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground">
                            Nova
                          </span>
                        )}
                      </div>
                      {n.body && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="inline-flex items-center h-4 px-1.5 rounded text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                          {config.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground/80">
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications && notifications.length > 0 && (
          <div className="border-t border-border/60 px-4 py-2.5 bg-muted/30 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <BellOff className="w-3 h-3" />
              Sincronizado agora
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {notifications.length} {notifications.length === 1 ? "item" : "itens"}
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
