import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Building2, Lock } from "lucide-react";

type RedeemState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; email: string; password: string }
  | { kind: "error"; message: string };

export default function PortalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [redeem, setRedeem] = useState<RedeemState>({ kind: "idle" });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();

  const accessToken = params.get("access");
  // Only attempt the exchange once per token to avoid a re-render loop.
  const redeemedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    if (redeemedFor.current === accessToken) return;
    redeemedFor.current = accessToken;

    setRedeem({ kind: "loading" });
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("redeem-portal-token", {
          body: { token: accessToken },
        });
        if (error) throw error;
        if (data?.error === "expired_token") {
          setRedeem({ kind: "error", message: t("portal.accessExpired") });
          return;
        }
        if (data?.error || !data?.email || !data?.password) {
          setRedeem({ kind: "error", message: t("portal.accessInvalid") });
          return;
        }
        setEmail(data.email);
        setPassword(data.password);
        setRedeem({ kind: "ready", email: data.email, password: data.password });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : t("portal.accessInvalid");
        setRedeem({ kind: "error", message });
      }
    })();
  }, [accessToken, t]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: portalLink } = await supabase
        .from("client_portal_users")
        .select("client_id")
        .eq("user_id", authData.user.id)
        .single();

      if (!portalLink) {
        await supabase.auth.signOut();
        toast({ title: t("portal.error"), description: t("toast.portalAccessNotFound"), variant: "destructive" });
        return;
      }

      navigate("/portal");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: t("portal.error"), description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const preFilled = redeem.kind === "ready";
  const showSpinner = redeem.kind === "loading";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
              <Building2 className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t("portal.login")}</CardTitle>
          <CardDescription>
            {preFilled ? t("portal.preFilledSubtitle") : t("portal.loginSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showSpinner ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("portal.preparingAccess")}</p>
            </div>
          ) : redeem.kind === "error" ? (
            <div className="space-y-4">
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {redeem.message}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {t("portal.contactAdmin")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("portal.email")}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly={preFilled}
                  className={preFilled ? "bg-muted/60 cursor-not-allowed" : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  {t("portal.password")}
                  {preFilled && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      {t("portal.passwordLocked")}
                    </span>
                  )}
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  readOnly={preFilled}
                  tabIndex={preFilled ? -1 : 0}
                  autoComplete={preFilled ? "off" : "current-password"}
                  className={preFilled ? "bg-muted/60 cursor-not-allowed select-none" : undefined}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("portal.submitting")}</>
                ) : (
                  t("portal.submit")
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
