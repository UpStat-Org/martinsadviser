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

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*$/;
const RESERVED = new Set(["www", "app", "api", "admin", "status", "martinsadviser"]);

export default function StartOrg() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refresh } = useOrg();

  const [step, setStep] = useState<"form" | "creating" | "done">("form");
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
    if (!SLUG_REGEX.test(slug)) return "Use só letras minúsculas, números e hífens";
    if (RESERVED.has(slug)) return "Esse slug está reservado";
    if (slug.length < 2) return "Mínimo 2 caracteres";
    return null;
  }, [slug]);

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
      // 1) Auth signup — intent flag tells handle_new_user not to enroll
      // this user in the cliente 0 org.
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            intent: "new-org",
          },
        },
      });
      if (signUpErr) throw signUpErr;

      // Email confirmation is project-dependent. If confirmation is required
      // by the Supabase project, signUpData.session is null — surface a
      // friendlier error message in that case so we don't silently fail.
      if (!signUpData.session) {
        throw new Error(
          "Verifique seu email para confirmar a conta antes de continuar. " +
          "Depois faça login que terminamos a criação da organização.",
        );
      }

      // 2) Provision the org. RPC validates slug, creates org + owner
      // membership, sets profile.active_org_id.
      const { data: orgId, error: rpcErr } = await supabase.rpc(
        "public_create_org_with_owner",
        { p_slug: slug, p_name: companyName, p_country: country },
      );
      if (rpcErr) throw rpcErr;
      if (!orgId) throw new Error("Falha ao criar organização");

      // 3) Refresh org context so the rest of the app sees the new org.
      await refresh();

      setStep("done");

      // 4) Redirect to the new tenant's subdomain. In dev (localhost /
      // lovable preview / netlify preview) we don't have one, so we just
      // bounce to /settings on the root.
      setTimeout(() => {
        const host = window.location.hostname;
        const isDev =
          host === "localhost" ||
          host.endsWith(".lovable.app") ||
          host.endsWith(".lovableproject.com") ||
          host.endsWith(".netlify.app");
        if (isDev) {
          navigate("/settings?welcome=1");
        } else {
          // Replace the leading subdomain (or apex) with the new slug.
          const parts = host.split(".");
          const apex = parts.length >= 2 ? parts.slice(-2).join(".") : host;
          window.location.assign(`https://${slug}.${apex}/settings?welcome=1`);
        }
      }, 900);
    } catch (e: any) {
      toast({ title: "Não foi possível criar a organização", description: e.message, variant: "destructive" });
      setStep("form");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left visual panel */}
      <div className="hidden lg:flex lg:w-[45%] aurora-bg relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-60" />
        <div className="orb w-80 h-80 bg-primary/30 top-1/4 left-1/4 animate-pulse-glow" />
        <div className="orb w-96 h-96 bg-accent/20 bottom-1/4 right-1/4 animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div className="relative z-10 flex flex-col justify-between px-16 py-14 w-full">
          <div className="flex items-center gap-3">
            <Logo className="w-12 h-12 rounded-2xl shadow-xl ring-1 ring-white/20" />
            <Wordmark size="xl" tone="light" />
          </div>
          <div className="space-y-5">
            <h2 className="font-display text-5xl font-bold text-white leading-tight">
              Bem-vindo à sua nova<br />operação.
            </h2>
            <p className="text-white/65 text-lg max-w-md leading-relaxed">
              Configure sua organização em 60 segundos. Você ganha 14 dias de trial completo — sem cartão.
            </p>
            <ul className="space-y-2.5 mt-6">
              {[
                "Gestão completa de permits e compliance",
                "Portal do cliente final + assinaturas",
                "Automações de vencimento e mensagens",
                "Branding próprio e subdomínio dedicado",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-white/75 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-white/40 text-xs">
            <Link to="/login" className="hover:text-white/80 transition-colors">← Já tenho conta</Link>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[480px]">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Logo className="w-10 h-10 rounded-xl shadow-md" />
            <Wordmark size="lg" tone="dark" />
          </div>

          {step === "done" ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold">Organização criada!</h1>
                  <p className="text-sm text-muted-foreground mt-1">Redirecionando você…</p>
                </div>
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold uppercase tracking-wider text-primary mb-3">
                  <Building2 className="w-3 h-3" />
                  Nova organização
                </div>
                <h1 className="font-display text-3xl font-bold tracking-tight">Comece sua operação</h1>
                <p className="text-muted-foreground mt-1.5 text-[15px]">
                  14 dias de trial. Pagamento começa depois.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Nome da empresa" required>
                    <Input
                      autoFocus
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Permit Services"
                    />
                  </Field>

                  <Field
                    label="Subdomínio"
                    required
                    hint={slug ? `${slug}.martinsadviser.com` : "Identifica sua org na URL"}
                    error={slugError}
                  >
                    <Input
                      value={slug}
                      onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true); }}
                      placeholder="acme"
                      className="font-mono"
                    />
                  </Field>

                  <Field label="País principal" required>
                    <Select value={country} onValueChange={(v) => setCountry(v as "US" | "BR" | "ES")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">🇺🇸 Estados Unidos</SelectItem>
                        <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                        <SelectItem value="ES">🇪🇸 Espanha</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="pt-2 mt-2 border-t border-border/40">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Seu acesso</p>
                  </div>

                  <Field label="Seu nome">
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="João da Silva"
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

                  <Field label="Senha" required hint="Mínimo 6 caracteres">
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
                    <><Loader2 className="w-4 h-4 animate-spin" /> Criando…</>
                  ) : (
                    <>Criar organização <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
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
