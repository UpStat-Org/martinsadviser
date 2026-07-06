import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useHostnameOrg } from "@/hooks/useHostnameOrg";
import { splitWordmark } from "@/contexts/OrgContext";
import { applyBrandingColors } from "@/lib/color";
import {
  Truck,
  Mail,
  Lock,
  Shield,
  BarChart3,
  Users,
  Clock,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";

export default function Login() {
  // Pre-fill the email when arriving from an invite link so the user doesn't
  // have to remember which address the org owner used.
  const initialEmail = (typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("email")
    : null) ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const { hostOrg, slug, hostname, isStrict, loading: orgLoading } = useHostnameOrg();

  // Branding shown on this Login page. When the URL points at a tenant
  // subdomain we render that org's logo/name; in dev mode (no subdomain
  // routing) we fall back to the default look.
  const brandingApp = hostOrg
    ? ((hostOrg.branding as { app_name?: string })?.app_name ?? hostOrg.name)
    : "DotPilot";
  const brandingTagline = hostOrg
    ? ((hostOrg.branding as { tagline?: string })?.tagline ?? "")
    : "Pilot";
  const brandingLogo = hostOrg
    ? ((hostOrg.branding as { logo_url?: string | null })?.logo_url ?? null)
    : null;
  const brandingPrimary = hostOrg
    ? ((hostOrg.branding as { primary_color?: string | null })?.primary_color ?? null)
    : null;
  const brandingAccent = hostOrg
    ? ((hostOrg.branding as { accent_color?: string | null })?.accent_color ?? null)
    : null;

  // Apply the tenant's brand colors while the Login page is mounted so the
  // shadcn-themed surfaces (button, focus ring, accent badges) match the
  // rest of the tenant's UI even before the user signs in. OrgProvider
  // re-applies the same values post-auth, so there's no visual jump.
  useEffect(() => {
    applyBrandingColors({ primary: brandingPrimary, accent: brandingAccent });
    return () => applyBrandingColors({ primary: null, accent: null });
  }, [brandingPrimary, brandingAccent]);
  const wordmark = splitWordmark({
    app_name: brandingApp,
    tagline: brandingTagline,
    logo_url: brandingLogo,
    primary_color: brandingPrimary,
    accent_color: brandingAccent,
  });

  // Strict host points at a tenant subdomain/custom domain we don't have an
  // org for → 404-ish state.
  const hostNotFound = isStrict && !orgLoading && !hostOrg;

  // Surface cross-org redirect from OrgProvider as a toast on first paint.
  useEffect(() => {
    if (searchParams.get("error") === "cross_org") {
      const host = searchParams.get("host") ?? "";
      toast({
        title: "Acesso negado",
        description: host
          ? `Você não pertence à organização "${host}". Acesse o subdomínio da sua organização.`
          : t("login.errorCrossOrg"),
        variant: "destructive",
      });
    }
  }, [searchParams, toast, t]);

  // Host doesn't match any org → warn once and let the user proceed
  // anyway (the auth will still work; OrgProvider will then redirect them).
  useEffect(() => {
    if (hostNotFound) {
      const label = slug ?? hostname;
      toast({
        title: t("login.orgNotFound"),
        description: `Não existe organização para "${label}". Verifique o endereço.`,
        variant: "destructive",
      });
    }
  }, [hostNotFound, hostname, slug, toast, t]);

  // If we arrived from /invite/<token> the URL carries ?invite=<token>; after
  // a successful sign-in we still need to redeem the invitation. We do it
  // here (not in InviteAccept) because the user lands back on /login when
  // they're not yet authenticated; this is the natural place to close the
  // loop.
  const inviteToken = searchParams.get("invite");
  const inviteEmail = searchParams.get("email");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: t("login.error"), description: error.message, variant: "destructive" });
        return;
      }
      if (inviteToken) {
        const { error: acceptErr } = await supabase.rpc("accept_invitation", { p_token: inviteToken });
        if (acceptErr) {
          toast({ title: "Convite", description: acceptErr.message, variant: "destructive" });
          // Still send them in — they're authenticated, just not joined.
        } else {
          toast({ title: "Convite aceito!" });
        }
      }
      navigate("/");
    } catch (err: any) {
      toast({ title: t("login.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Branding side — calm and informative, no glow */}
      <div className="hidden lg:flex lg:w-[42%] bg-muted/40 border-r border-border">
        <div className="flex flex-col justify-between px-12 xl:px-16 py-12 w-full max-w-xl">
          <div className="flex items-center gap-2.5">
            <Logo src={brandingLogo} title={brandingApp} className="w-9 h-9 rounded" />
            <Wordmark
              size="lg"
              tone="dark"
              primary={wordmark.primary}
              secondary={wordmark.secondary}
              accentColor={brandingAccent}
            />
          </div>

          <div>
            <h2 className="text-3xl xl:text-4xl font-semibold tracking-tight text-foreground leading-tight">
              {t("login.brandingHeadline")}
            </h2>
            <p className="text-muted-foreground text-base mt-4 max-w-md">
              {t("login.brandingSubtitle")}
            </p>
          </div>

          <ul className="space-y-2.5 text-sm text-foreground/80 max-w-md">
            {[
              { icon: Shield, label: t("login.feature.compliance") },
              { icon: BarChart3, label: t("login.feature.aiReports") },
              { icon: Users, label: t("login.feature.portal") },
              { icon: Clock, label: t("login.feature.automations") },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded bg-card border border-border flex items-center justify-center text-muted-foreground">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
            <Logo src={brandingLogo} title={brandingApp} className="w-8 h-8 rounded" />
            <Wordmark
              size="md"
              tone="dark"
              primary={wordmark.primary}
              secondary={wordmark.secondary}
              accentColor={brandingAccent}
            />
          </div>

          <div className="rounded-md border border-border bg-card p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {t("login.welcome")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("login.subtitle")}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-foreground">
                    {t("login.password")}
                  </Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() =>
                      toast({
                        title: t("login.passwordRecovery"),
                        description: t("login.contactAdmin"),
                      })
                    }
                  >
                    {t("login.forgot")}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-9 pl-9 pr-9"
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? t("login.submitting") : (
                  <>
                    {t("login.submit")}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                {t("login.noAccount")}{" "}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  {t("login.requestAccess")}
                </Link>
              </p>
              <p className="text-xs text-muted-foreground">
                {t("login.newOrgPrompt")}{" "}
                <Link to="/start" className="text-primary hover:underline font-medium">
                  {t("login.newOrgCta")}
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-5">
            © {new Date().getFullYear()} {brandingApp} · {t("common.allRightsReserved")}
          </p>
        </div>
      </div>
    </div>
  );
}
