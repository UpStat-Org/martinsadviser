import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, RefreshCw, Check, X, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
    // Check for callback success
    const params = new URLSearchParams(window.location.search);
    if (params.get("gcal") === "connected") {
      toast({ title: t("settings.connected") });
      window.history.replaceState({}, "", "/settings");
      checkConnection();
    }
  }, []);

  async function checkConnection() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("google_calendar_tokens")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsConnected(!!data);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/google-calendar-auth`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (e: any) {
      toast({ title: t("settings.connectError"), description: e.message, variant: "destructive" });
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("google_calendar_tokens").delete().eq("user_id", user.id);
    setIsConnected(false);
    toast({ title: t("settings.disconnected") });
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/google-calendar-sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast({ title: t("settings.syncSuccess"), description: `${result.created}/${result.total} eventos criados` });
    } catch (e: any) {
      toast({ title: t("settings.syncError"), description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarDays className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Google Calendar</CardTitle>
                <CardDescription>{t("settings.syncCalendar")}</CardDescription>
              </div>
            </div>
            {!loading && (
              <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
                {isConnected ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {isConnected ? t("settings.connected") : t("settings.notConnected")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {isConnected ? (
              <>
                <Button onClick={handleSync} disabled={syncing} className="gap-2">
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {syncing ? t("settings.syncing") : t("settings.syncNow")}
                </Button>
                <Button variant="outline" onClick={handleDisconnect}>
                  {t("settings.disconnect")}
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect} disabled={connecting} className="gap-2">
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                {t("settings.connect")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
