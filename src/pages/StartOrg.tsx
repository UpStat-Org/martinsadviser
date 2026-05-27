import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrg } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { ArrowRight, Building2, CheckCircle2, Loader2 } from "lucide-react";

// Derives a URL-safe slug from the company name as the user types.
// Idempotent: applying twice gives the same result.
function suggestSlug(name: string): string {
  return name
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

// Sends the user to the new tenant's subdomain after a successful provision.
// In dev (localhost, lovable/netlify previews) there's no subdomain to use,
// so we bounce to /settings on the same host.
function redirectToOrg(slug: string, navigate: (to: string) => void) {
  const host = window.location.hostname;
  const isDev =
    host === "localhost" ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".netlify.app");
  if (isDev) {
    navigate("/settings?welcome=1");
  } else {
    const parts = host.split(".");
    const apex = parts.length >= 2 ? parts.slice(-2).join(".") : host;
    window.location.assign(`https://${slug}.${apex}/settings?welcome=1`);
  }
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*$/;
const RESERVED = new Set(["www", "app", "api", "admin", "status", "martinsadviser"]);

export default function StartOrg() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refresh } = useOrg();
  const { t } = useLanguage();

  const [step, setStep] = useState<"form" | "creating" | "done" | "confirm-email">("form");
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [country, setCountry] = useState<"US" | "BR" | "ES">("US");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-suggest slug from company name unless the user has typed their own.
  useEffect(() => {
    if (!slugTouched) setSlug(suggestSlug(companyName));
  }, [companyName, slugTouched]);

  const slugError = useMemo(() => {
    if (!slug) return null;
    if (!SLUG_REGEX.test(slug)) return t("startOrg.slug.invalidChars");
    if (RESERVED.has(slug)) return t("startOrg.slug.reserved");
    if (slug.length < 2) return t("startOrg.slug.tooShort");
    return null;
  }, [slug, t]);

  const canSubmit =
    companyName.trim().length > 0 &&
    slug.length >= 2 &&
    !slugError &&
    email.length > 0 &&
    password.length >= 6 &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setStep("creating");

    try {
      // The trigger handle_new_user reads these metadata fields and
      // provisions the org + owner membership + profile.active_org_id in
      // the same transaction as the auth.users insert. So we don't need
      // a session before the org exists — even if the project requires
      // email confirmation, the org is already there when the user clicks
      // the link and lands on /login.
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            intent: "new-org",
            slug,
            org_name: companyName,
            country,
          },
        },
      });
      if (signUpErr) throw signUpErr;

      // Path A: project doesn't require email confirmation → session ready
      // immediately. Refresh org context and redirect to the new subdomain.
      if (signUpData.session) {
        await refresh();
        setStep("done");
        setTimeout(() => redirectToOrg(slug, navigate), 900);
        return;
      }

      // Path B: email confirmation pending. The org already exists — we
      // just need the user to confirm and come back.
      setStep("confirm-email");
    } catch (e: any) {
      toast({ title: t("startOrg.createFailed"), description: e.message, variant: "destructive" });
      setStep("form");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left visual panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-card border border-border relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between px-16 py-14 w-full">
          <div className="flex items-center gap-3">
            <Logo className="w-12 h-12 rounded-md ring-1 ring-white/20" />
            <Wordmark size="xl" tone="light" />
          </div>
          <div className="space-y-5">
            <h2 className="text-5xl font-bold text-foreground leading-tight">
              {t("startOrg.welcomeNewOp")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
              {t("startOrg.trialBlurb")}
            </p>
            <ul className="space-y-2.5 mt-6">
              {[
                t("startOrg.benefit1"),
                t("startOrg.benefit2"),
                t("startOrg.benefit3"),
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-foreground/75 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-muted-foreground text-xs">
            <Link to="/login" className="hover:text-muted-foreground transition-colors">← {t("startOrg.haveAccount")}</Link>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[480px]">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Logo className="w-10 h-10 rounded-md" />
            <Wordmark size="lg" tone="dark" />
          </div>

          {step === "done" ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-md bg-success/15 text-success flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">{t("startOrg.orgCreated")}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{t("common.loading")}</p>
                </div>
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
              </CardContent>
            </Card>
          ) : step === "confirm-email" ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-md bg-primary/15 text-primary flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-lg font-semibold">{t("startOrg.orgCreated")}</h1>
                  <p className="text-sm text-muted-foreground">
                    {t("startOrg.confirmEmailDesc").split("{email}").map((part, i) =>
                      i === 0 ? part : <><strong className="text-foreground">{email}</strong>{part}</>
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-left text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{t("startOrg.subdomainLabel")}</span>
                    <span className="font-mono font-semibold">{slug}.martinsadviser.com</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{t("common.status")}</span>
                    <span className="font-semibold text-primary">{t("startOrg.awaitingConfirmation")}</span>
                  </div>
                </div>
                <Button asChild className="w-full">
                  <Link to="/login">{t("common.goToLogin")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold uppercase tracking-wider text-primary mb-3">
                  <Building2 className="w-3 h-3" />
                  {t("superadmin.newOrg")}
                </div>
                <h1 className="text-xl font-semibold tracking-tight">{t("startOrg.startTitle")}</h1>
                <p className="text-muted-foreground mt-1.5 text-[15px]">
                  {t("startOrg.trialBlurb")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <Field label={t("startOrg.companyNameLabel")} required>
                    <Input
                      autoFocus
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Permit Services"
                    />
                  </Field>

                  <Field
                    label={t("startOrg.subdomainLabel")}
                    required
                    hint={slug ? `${slug}.martinsadviser.com` : t("startOrg.subdomainHint")}
                    error={slugError}
                  >
                    <Input
                      value={slug}
                      onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true); }}
                      placeholder="acme"
                      className="font-mono"
                    />
                  </Field>

                  <Field label={t("startOrg.country")} required>
                    <Select value={country} onValueChange={(v) => setCountry(v as "US" | "BR" | "ES")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">🇺🇸 {t("country.us")}</SelectItem>
                        <SelectItem value="BR">🇧🇷 {t("country.br")}</SelectItem>
                        <SelectItem value="ES">🇪🇸 {t("country.es")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="pt-2 mt-2 border-t border-border/40">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">{t("startOrg.yourAccess")}</p>
                  </div>

                  <Field label={t("common.name")}>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("startOrg.fullNamePlaceholder")}
                    />
                  </Field>

                  <Field label="Email" required>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@empresa.com"
                    />
                  </Field>

                  <Field label={t("login.password")} required hint={t("startOrg.passwordHint")}>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </Field>
                </div>

                <Button type="submit" disabled={!canSubmit} className="w-full gap-2 h-11 mt-2">
                  {step === "creating" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t("startOrg.creating")}</>
                  ) : (
                    <>{t("startOrg.cta")} <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  {t("startOrg.haveAccount")} <Link to="/login" className="text-primary hover:underline">{t("common.signIn")}</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label, required, hint, error, children,
}: {
  label: string;
  required?: boolean;
  hint?: string | null;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground font-mono">{hint}</p>
      ) : null}
    </div>
  );
}
