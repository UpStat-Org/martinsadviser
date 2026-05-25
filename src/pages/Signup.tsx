import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Truck,
  Mail,
  Lock,
  User,
  Shield,
  BarChart3,
  Users,
  Clock,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";

export default function Signup() {
  // When arriving from /invite/<token>, pre-fill the email and remember
  // the token so we can redeem the invitation after email confirmation.
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const inviteToken = searchParams.get("invite");
  const inviteEmail = searchParams.get("email") ?? "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
  }, [password]);

  const strengthLabels = [
    t("signup.strength.veryWeak"),
    t("signup.strength.weak"),
    t("signup.strength.medium"),
    t("signup.strength.strong"),
    t("signup.strength.excellent"),
  ];
  const strengthColors = [
    "bg-destructive",
    "bg-destructive",
    "bg-warning",
    "bg-primary",
    "bg-success",
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Persist the invite token on the user so we can redeem it after
        // they confirm via email and sign in. handle_new_user ignores it
        // (no intent='new-org'), so the normal pending-member-of-cliente-0
        // path takes over until they click their invite again.
        data: { full_name: fullName, invite_token: inviteToken },
        emailRedirectTo: inviteToken
          ? `${window.location.origin}/invite/${inviteToken}`
          : window.location.origin,
      },
    });
    if (error) {
      toast({ title: t("signup.error"), description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    // If signup returned a session immediately (email confirmation off),
    // redeem the invite right away and route into the app.
    if (data.session && inviteToken) {
      const { error: acceptErr } = await supabase.rpc("accept_invitation", { p_token: inviteToken });
      if (acceptErr) {
        toast({ title: "Convite", description: acceptErr.message, variant: "destructive" });
      } else {
        toast({ title: "Convite aceito!" });
      }
      window.location.assign("/");
      return;
    }
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <div className="rounded-md border border-border bg-card p-8 sm:p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-success" strokeWidth={2.2} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {t("signup.success")}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {t("signup.successDesc")}
            </p>
            <Link to="/login" className="inline-block mt-6">
              <Button>
                {t("signup.backToLogin")}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const benefits = [
    t("signup.benefit.permits"),
    t("signup.benefit.compliance"),
    t("signup.benefit.portal"),
    t("signup.benefit.reports"),
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Branding side — calm and informative */}
      <div className="hidden lg:flex lg:w-[42%] bg-muted/40 border-r border-border">
        <div className="flex flex-col justify-between px-12 xl:px-16 py-12 w-full max-w-xl">
          <div className="flex items-center gap-2.5">
            <Logo className="w-9 h-9 rounded" />
            <Wordmark size="lg" tone="dark" />
          </div>

          <div>
            <h2 className="text-3xl xl:text-4xl font-semibold tracking-tight text-foreground leading-tight">
              {t("signup.brandingHeadline")}
            </h2>
            <p className="text-muted-foreground text-base mt-4 max-w-md">
              {t("signup.brandingSubtitle")}
            </p>
          </div>

          <ul className="space-y-2.5 text-sm text-foreground/80 max-w-md">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded bg-card border border-border flex items-center justify-center mt-0.5 shrink-0">
                  <Check className="w-3 h-3 text-success" strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
            <Logo className="w-8 h-8 rounded" />
            <Wordmark size="md" tone="dark" />
          </div>

          <div className="rounded-md border border-border bg-card p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {t("signup.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{t("signup.subtitle")}</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium text-foreground">
                  {t("signup.fullName")}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("common.fullNamePlaceholder")}
                    className="h-9 pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-foreground">
                  {t("login.email")}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("common.emailPlaceholder")}
                    className="h-9 pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-foreground">
                  {t("login.password")}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-9 pl-9 pr-9"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {password.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-0.5 flex-1 rounded transition-colors ${
                            i < passwordStrength ? strengthColors[passwordStrength] : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {t("signup.passwordStrength")}{" "}
                      <span className="font-medium text-foreground">
                        {strengthLabels[passwordStrength]}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? t("signup.submitting") : (
                  <>
                    {t("signup.submit")}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6 pt-5 border-t border-border">
              {t("signup.hasAccount")}{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                {t("signup.login")}
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-5">
            © {new Date().getFullYear()} MartinsAdviser · {t("common.allRightsReserved")}
          </p>
        </div>
      </div>
    </div>
  );
}
