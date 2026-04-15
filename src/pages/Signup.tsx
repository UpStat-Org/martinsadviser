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

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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

  const strengthLabels = ["Muito fraca", "Fraca", "Média", "Forte", "Excelente"];
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: t("signup.error"), description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6">
        <div className="orb w-[500px] h-[500px] bg-success/10 top-1/4 left-1/4 animate-pulse-glow" />
        <div
          className="orb w-[400px] h-[400px] bg-primary/10 bottom-1/4 right-1/4 animate-pulse-glow"
          style={{ animationDelay: "1.2s" }}
        />
        <div className="absolute inset-0 grid-pattern opacity-40" />

        <div className="relative z-10 w-full max-w-md animate-scale-in">
          <div className="glass-card-premium shimmer-border rounded-3xl p-10 text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-success/20 animate-pulse-glow" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-success/20 to-success/5 border border-success/30 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-success" strokeWidth={2.2} />
              </div>
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">
              {t("signup.success")}
            </h2>
            <p className="text-muted-foreground text-[15px] leading-relaxed mb-8">
              {t("signup.successDesc")}
            </p>
            <Link to="/login">
              <Button className="h-11 px-8 font-semibold btn-gradient text-white border-0 hover:shadow-[0_10px_40px_-10px_hsl(234_75%_58%/0.6)]">
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
    "Gestão completa de permits e rotas",
    "Compliance automatizado com IA",
    "Portal dedicado para clientes",
    "Relatórios inteligentes em tempo real",
  ];

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      <div className="orb w-[520px] h-[520px] bg-primary/10 -top-40 -right-40" />
      <div className="orb w-[420px] h-[420px] bg-accent/10 -bottom-40 right-1/4" />

      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[55%] aurora-bg relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-60" />
        <div className="absolute inset-0 noise-overlay" />

        <div className="orb w-80 h-80 bg-primary/30 top-1/4 left-1/4 animate-pulse-glow" />
        <div
          className="orb w-96 h-96 bg-accent/20 bottom-1/4 right-1/4 animate-pulse-glow"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full conic-ring opacity-[0.08] blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between px-16 xl:px-20 py-14 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 animate-slide-in-left">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
              <Truck className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-emerald-300 to-emerald-500 ring-2 ring-[#0b0d2e]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-2xl font-bold text-white tracking-tight">
                MartinsAdviser
              </span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-white/50 mt-1">
                Permits · Compliance · AI
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="animate-slide-in-left max-w-xl" style={{ animationDelay: "0.1s" }}>
            <h2 className="font-display text-5xl xl:text-[64px] font-bold leading-[1.05] gradient-text mb-6">
              {t("signup.brandingHeadline").split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
            </h2>
            <p className="text-white/65 text-lg max-w-md leading-relaxed">
              {t("signup.brandingSubtitle")}
            </p>
          </div>

          {/* Benefits checklist */}
          <div className="space-y-4 animate-slide-in-left" style={{ animationDelay: "0.2s" }}>
            <div className="space-y-3 max-w-md">
              {benefits.map((b, i) => (
                <div
                  key={b}
                  className="flex items-center gap-3 animate-slide-in-left"
                  style={{ animationDelay: `${0.25 + i * 0.05}s` }}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-emerald-300" strokeWidth={3} />
                  </div>
                  <span className="text-[15px] text-white/85">{b}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md pt-4">
              {[
                { icon: Shield, label: "Compliance" },
                { icon: BarChart3, label: "Relatórios IA" },
                { icon: Users, label: "Portal do Cliente" },
                { icon: Clock, label: "Automações" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="glass-badge px-4 py-3 flex items-center gap-3 hover:bg-white/15 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white/85">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute top-20 right-20 w-24 h-24 rounded-3xl border border-white/10 rotate-12 animate-float backdrop-blur-sm" />
        <div className="absolute bottom-32 right-40 w-16 h-16 rounded-2xl border border-white/10 -rotate-6 animate-float-delayed backdrop-blur-sm" />
        <div className="absolute top-1/2 right-16 w-2.5 h-2.5 rounded-full bg-white/30 animate-float" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2.5 mb-10 lg:hidden animate-fade-in">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
              <Truck className="w-5 h-5" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
              MartinsAdviser
            </h1>
          </div>

          <div className="glass-card-premium shimmer-border rounded-3xl p-8 sm:p-10 animate-fade-in">
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">{t("signup.subtitle")}</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                {t("signup.title")}
              </h1>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  {t("signup.fullName")}
                </Label>
                <div className="relative input-glow rounded-xl transition-all">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-12 pl-10 rounded-xl bg-muted/40 border-border/60 focus:bg-background focus:border-primary/40 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.15s" }}>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  {t("login.email")}
                </Label>
                <div className="relative input-glow rounded-xl transition-all">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-12 pl-10 rounded-xl bg-muted/40 border-border/60 focus:bg-background focus:border-primary/40 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  {t("login.password")}
                </Label>
                <div className="relative input-glow rounded-xl transition-all">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 pl-10 pr-11 rounded-xl bg-muted/40 border-border/60 focus:bg-background focus:border-primary/40 transition-all"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {password.length > 0 && (
                  <div className="pt-2 space-y-1.5 animate-fade-in">
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i < passwordStrength ? strengthColors[passwordStrength] : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Força da senha:{" "}
                      <span className="font-medium text-foreground">
                        {strengthLabels[passwordStrength]}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="animate-fade-in pt-1" style={{ animationDelay: "0.25s" }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full h-12 btn-gradient text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-[0_10px_40px_-10px_hsl(234_75%_58%/0.6)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {loading ? (
                    t("signup.submitting")
                  ) : (
                    <>
                      {t("signup.submit")}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div
              className="flex items-center gap-4 my-7 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.25em] font-semibold">
                ou
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            <p
              className="text-center text-sm text-muted-foreground animate-fade-in"
              style={{ animationDelay: "0.35s" }}
            >
              {t("signup.hasAccount")}{" "}
              <Link
                to="/login"
                className="text-primary hover:text-primary/80 font-semibold transition-colors inline-flex items-center gap-1"
              >
                {t("signup.login")}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground/70 mt-6 animate-fade-in">
            © {new Date().getFullYear()} MartinsAdviser · Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
