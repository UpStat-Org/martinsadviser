import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: t("login.error"), description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    } catch (err: any) {
      toast({ title: t("login.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Ambient background orbs for the right (form) side */}
      <div className="orb w-[520px] h-[520px] bg-primary/10 -top-40 -right-40" />
      <div className="orb w-[420px] h-[420px] bg-accent/10 -bottom-40 right-1/4" />

      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[55%] aurora-bg relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-60" />
        <div className="absolute inset-0 noise-overlay" />

        {/* Glow orbs */}
        <div className="orb w-80 h-80 bg-primary/30 top-1/4 left-1/4 animate-pulse-glow" />
        <div
          className="orb w-96 h-96 bg-accent/20 bottom-1/4 right-1/4 animate-pulse-glow"
          style={{ animationDelay: "1.5s" }}
        />

        {/* Conic spinning ring decoration */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full conic-ring opacity-[0.08] blur-2xl" />

        {/* Content */}
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
              {t("login.brandingHeadline").split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
            </h2>
            <p className="text-white/65 text-lg max-w-md leading-relaxed">
              {t("login.brandingSubtitle")}
            </p>
          </div>

          {/* Stats + badges */}
          <div className="space-y-8 animate-slide-in-left" style={{ animationDelay: "0.2s" }}>
            <div className="grid grid-cols-3 gap-6 max-w-lg">
              {[
                { value: "99.9%", label: "Uptime" },
                { value: "24/7", label: "Suporte" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-display text-3xl font-bold text-white tracking-tight">
                    {s.value}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-white/50 mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-lg">
              {[
                { icon: Shield, label: "Compliance", delay: "0.25s" },
                { icon: BarChart3, label: "Relatórios IA", delay: "0.3s" },
                { icon: Users, label: "Portal do Cliente", delay: "0.35s" },
                { icon: Clock, label: "Automações", delay: "0.4s" },
              ].map(({ icon: Icon, label, delay }) => (
                <div
                  key={label}
                  className="glass-badge px-4 py-3 flex items-center gap-3 animate-slide-in-left hover:bg-white/15 transition-colors"
                  style={{ animationDelay: delay }}
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

        {/* Floating decor */}
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

          {/* Card */}
          <div className="glass-card-premium shimmer-border rounded-3xl p-8 sm:p-10 animate-fade-in">
            {/* Form header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Acesso seguro</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                {t("login.welcome")}
              </h1>
              <p className="text-muted-foreground mt-2 text-[15px]">
                {t("login.subtitle")}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
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

              <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.15s" }}>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    {t("login.password")}
                  </Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    onClick={() =>
                      toast({
                        title: "Recuperação de senha",
                        description: "Entre em contato com o administrador do sistema.",
                      })
                    }
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative input-glow rounded-xl transition-all">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 pl-10 pr-11 rounded-xl bg-muted/40 border-border/60 focus:bg-background focus:border-primary/40 transition-all"
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
              </div>

              <div className="animate-fade-in pt-1" style={{ animationDelay: "0.2s" }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full h-12 btn-gradient text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-[0_10px_40px_-10px_hsl(234_75%_58%/0.6)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {loading ? (
                    t("login.submitting")
                  ) : (
                    <>
                      {t("login.submit")}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div
              className="flex items-center gap-4 my-7 animate-fade-in"
              style={{ animationDelay: "0.25s" }}
            >
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.25em] font-semibold">
                ou
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* Footer */}
            <p
              className="text-center text-sm text-muted-foreground animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              {t("login.noAccount")}{" "}
              <Link
                to="/signup"
                className="text-primary hover:text-primary/80 font-semibold transition-colors inline-flex items-center gap-1"
              >
                {t("login.requestAccess")}
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
