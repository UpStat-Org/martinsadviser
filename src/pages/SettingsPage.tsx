import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarDays,
  RefreshCw,
  Check,
  X,
  Loader2,
  User,
  Save,
  Key,
  Mail,
  Settings as SettingsIcon,
  ShieldCheck,
  Zap,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email || "");
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (profile) setFullName(profile.full_name || "");
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
        setNewPassword("");
      }
      toast({ title: "Perfil atualizado!" });
    } catch (e: any) {
      toast({
        title: "Erro ao salvar",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  useEffect(() => {
    checkConnection();
    const params = new URLSearchParams(window.location.search);
    if (params.get("gcal") === "connected") {
      toast({ title: t("settings.connected") });
      window.history.replaceState({}, "", "/settings");
      checkConnection();
    }
  }, []);

  async function checkConnection() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
      toast({
        title: t("settings.connectError"),
        description: e.message,
        variant: "destructive",
      });
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("google_calendar_tokens")
      .delete()
      .eq("user_id", user.id);
    setIsConnected(false);
    toast({ title: t("settings.disconnected") });
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
      toast({
        title: t("settings.syncSuccess"),
        description: `${result.created}/${result.total} eventos criados`,
      });
    } catch (e: any) {
      toast({
        title: t("settings.syncError"),
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }

  const initials = (fullName || email || "U")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl flex-shrink-0">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
              {t("settings.title")}
            </h1>
            <p className="text-white/70 mt-2 text-sm sm:text-base max-w-xl">
              {t("settings.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ============ TABS ============ */}
      <Tabs defaultValue="profile">
        <TabsList className="h-auto p-1.5 bg-muted/50 rounded-2xl">
          <TabsTrigger value="profile" className="rounded-xl gap-1.5">
            <User className="w-3.5 h-3.5" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-xl gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Integrações
          </TabsTrigger>
        </TabsList>

        {/* ============ PROFILE ============ */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card className="border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
            <CardContent className="p-6">
              <div className="flex items-center gap-4 pb-5 mb-5 border-b border-border/50">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-display font-bold text-xl shadow-xl ring-4 ring-white/10">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-bold text-lg truncate">
                    {fullName || "Seu perfil"}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {email || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome completo
                  </Label>
                  <div className="relative input-glow rounded-xl">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome"
                      className="h-11 pl-10 rounded-xl bg-muted/40 border-border/60 focus:bg-background"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </Label>
                  <div className="relative rounded-xl">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={email}
                      disabled
                      className="h-11 pl-10 rounded-xl bg-muted/60 border-border/60 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-gradient-to-br from-primary/[0.04] via-primary/[0.02] to-transparent border border-primary/10 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg btn-gradient flex items-center justify-center">
                    <Key className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Alterar senha</p>
                    <p className="text-[11px] text-muted-foreground">
                      Deixe em branco para manter a atual
                    </p>
                  </div>
                </div>
                <div className="relative input-glow rounded-xl max-w-md">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha"
                    className="h-11 pl-10 rounded-xl bg-background border-border/60"
                  />
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-border/50 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="group h-11 px-5 btn-gradient text-white text-sm font-semibold rounded-xl inline-flex items-center gap-1.5 hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all disabled:opacity-60 relative overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {savingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar perfil
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Security info card */}
          <Card className="border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-sm mb-1">
                    Conta segura
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Todos os seus dados são criptografados. Recomendamos usar
                    senhas fortes com pelo menos 10 caracteres incluindo números
                    e símbolos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ INTEGRATIONS ============ */}
        <TabsContent value="integrations" className="mt-4 space-y-4">
          <Card className="border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 flex items-center justify-center shadow-xl flex-shrink-0">
                    <CalendarDays className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-display font-bold text-lg">
                        Google Calendar
                      </h2>
                      {!loading &&
                        (isConnected ? (
                          <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Check className="w-2.5 h-2.5" />
                            Conectado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                            <X className="w-2.5 h-2.5" />
                            Desconectado
                          </span>
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.syncCalendar")}
                    </p>
                  </div>
                </div>
                {loading && (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                )}
              </div>

              {!loading && isConnected && (
                <div className="mt-5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    Sua conta do Google está conectada. Os vencimentos de
                    permits são sincronizados automaticamente com seu calendário.
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border/50">
                {isConnected ? (
                  <>
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="group h-11 px-5 btn-gradient text-white text-sm font-semibold rounded-xl inline-flex items-center gap-1.5 hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all disabled:opacity-60 relative overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      {syncing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {syncing ? t("settings.syncing") : t("settings.syncNow")}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="h-11 px-5 rounded-xl bg-muted/60 hover:bg-muted border border-border/60 text-sm font-semibold transition-colors"
                    >
                      {t("settings.disconnect")}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="group h-11 px-5 btn-gradient text-white text-sm font-semibold rounded-xl inline-flex items-center gap-1.5 hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all disabled:opacity-60 relative overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    {connecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CalendarDays className="w-4 h-4" />
                    )}
                    {t("settings.connect")}
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Coming soon card */}
          <Card className="border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-500 to-pink-500" />
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-md flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-sm">
                      Mais integrações em breve
                    </h3>
                    <span className="inline-flex items-center h-5 px-1.5 rounded text-[9px] font-bold uppercase tracking-wider bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20">
                      Soon
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Slack, QuickBooks, Outlook, WhatsApp Business e muito mais
                    estão a caminho.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
