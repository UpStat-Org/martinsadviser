import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Truck, Loader2, RefreshCw, Plug, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useEldConnections,
  useEldSyncLog,
  useConnectEld,
  useDisconnectEld,
  useSyncEldNow,
  type EldProvider,
} from "@/hooks/useEld";

const PROVIDERS: Array<{ id: EldProvider; name: string; gradient: string }> = [
  { id: "motive", name: "Motive", gradient: "from-orange-500 to-amber-500" },
  { id: "samsara", name: "Samsara", gradient: "from-sky-500 to-blue-500" },
];

function ProviderRow({ provider, name, gradient }: { id?: string; provider: EldProvider; name: string; gradient: string }) {
  const { t } = useLanguage();
  const { data: connections } = useEldConnections();
  const connect = useConnectEld();
  const disconnect = useDisconnectEld();
  const syncNow = useSyncEldNow();
  const [apiKey, setApiKey] = useState("");

  const conn = connections?.find((c) => c.provider === provider && c.status !== "disconnected");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{name}</p>
            {conn?.status === "connected" && (
              <Badge className="bg-success/10 text-success border-success/30 gap-1" variant="outline">
                <CheckCircle2 className="w-3 h-3" />{t("eld.connected")}
              </Badge>
            )}
            {conn?.status === "error" && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/30 gap-1" variant="outline">
                <AlertTriangle className="w-3 h-3" />{t("common.error")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {conn?.last_sync_at
              ? `${t("eld.lastSync")}: ${format(new Date(conn.last_sync_at), "dd/MM HH:mm")}`
              : t("eld.notConnected")}
          </p>
        </div>
      </div>

      {conn ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => syncNow.mutate()} disabled={syncNow.isPending}>
            {syncNow.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-1.5">{t("eld.syncNow")}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => disconnect.mutate(conn.id)} disabled={disconnect.isPending}>
            {t("settings.disconnect")}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t("eld.apiKeyPlaceholder")}
            className="w-44"
          />
          <Button
            size="sm"
            onClick={() => connect.mutate({ provider, apiKey }, { onSuccess: () => setApiKey("") })}
            disabled={!apiKey || connect.isPending}
          >
            {connect.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
            <span className="ml-1.5">{t("settings.connect")}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * ELD integration panel (Motive / Samsara). Org-admin only. Connects a
 * provider via API key and pulls HOS violations into the compliance data.
 * SCAFFOLD: live sync activates once real provider credentials are supplied.
 */
export function OrgEldPanel() {
  const { t } = useLanguage();
  const { data: logs } = useEldSyncLog();

  return (
    <Card className="border-border/50 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-sky-500" />
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="font-display font-bold text-sm">{t("eld.title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("eld.subtitle")}</p>
        </div>

        <div className="space-y-3">
          {PROVIDERS.map((p) => (
            <ProviderRow key={p.id} provider={p.id} name={p.name} gradient={p.gradient} />
          ))}
        </div>

        {logs && logs.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("eld.recentSyncs")}</p>
            <ul className="space-y-1">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{l.provider}</span>
                  <span>{format(new Date(l.started_at), "dd/MM HH:mm")}</span>
                  <span className="tabular-nums">{l.hos_imported} HOS</span>
                  <span className={l.status === "ok" ? "text-success" : l.status === "error" ? "text-destructive" : ""}>{l.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
