import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";

export default function ResetPassword() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setHasSession(Boolean(session));
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setHasSession(Boolean(session));
        setReady(true);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast({ title: t("resetPassword.tooShort"), variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: t("resetPassword.mismatch"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast({ title: t("resetPassword.success") });
      navigate("/login", { replace: true });
    } catch (error) {
      toast({ title: t("resetPassword.error"), description: errorMessage(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Logo className="w-10 h-10 rounded-md" />
          <Wordmark size="lg" tone="dark" />
        </div>
        <div className="rounded-md border border-border bg-card p-6 sm:p-8">
          <h1 className="text-xl font-semibold">{t("resetPassword.title")}</h1>
          {!ready ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : !hasSession ? (
            <div className="mt-3 space-y-4">
              <p className="text-sm text-muted-foreground">{t("resetPassword.invalidLink")}</p>
              <Link to="/login" className="text-sm text-primary hover:underline">{t("login.backToLogin")}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{t("resetPassword.newPassword")}</Label>
                <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{t("resetPassword.confirmPassword")}</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="w-full h-9 rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50">
                {loading ? t("login.submitting") : t("resetPassword.submit")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
