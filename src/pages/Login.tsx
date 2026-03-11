import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Truck, Mail, Lock, Shield, BarChart3, Users, Clock, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: t("login.error"), description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel - mesh gradient with floating badges */}
      <div className="hidden lg:flex lg:w-[55%] mesh-gradient relative overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 grid-pattern" />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/20 blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-accent/10 blur-[120px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-20 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12 animate-slide-in-left">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-white tracking-tight">MartinsAdviser</span>
          </div>

          {/* Headline */}
          <div className="animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
            <h2 className="font-display text-5xl xl:text-6xl font-bold leading-[1.1] text-white mb-6">
              {t("login.brandingHeadline").split('\n').map((line, i) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </h2>
            <p className="text-white/60 text-lg max-w-md leading-relaxed">
              {t("login.brandingSubtitle")}
            </p>
          </div>

          {/* Floating feature badges */}
          <div className="mt-16 grid grid-cols-2 gap-4 max-w-md">
            {[
              { icon: Shield, label: "Compliance", delay: "0.2s" },
              { icon: BarChart3, label: "Relatórios IA", delay: "0.3s" },
              { icon: Users, label: "Portal do Cliente", delay: "0.4s" },
              { icon: Clock, label: "Automações", delay: "0.5s" },
            ].map(({ icon: Icon, label, delay }) => (
              <div
                key={label}
                className="glass-badge px-4 py-3 flex items-center gap-3 animate-slide-in-left"
                style={{ animationDelay: delay }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-white/80" />
                </div>
                <span className="text-sm font-medium text-white/80">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-16 right-16 w-20 h-20 rounded-2xl border border-white/10 rotate-12 animate-float" />
        <div className="absolute bottom-24 right-32 w-14 h-14 rounded-xl border border-white/5 -rotate-6 animate-float-delayed" />
        <div className="absolute top-1/2 right-12 w-3 h-3 rounded-full bg-white/20 animate-float" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2.5 mb-10 lg:hidden animate-fade-in">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
              <Truck className="w-5 h-5" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">MartinsAdviser</h1>
          </div>

          {/* Form header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">
              {t("login.welcome")}
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              {t("login.subtitle")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                {t("login.email")}
              </Label>
              <div className="relative input-glow rounded-lg transition-all">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-12 pl-10 bg-muted/40 border-border/60 focus:bg-background focus:border-primary/40 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                {t("login.password")}
              </Label>
              <div className="relative input-glow rounded-lg transition-all">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pl-10 bg-muted/40 border-border/60 focus:bg-background focus:border-primary/40 transition-all"
                  required
                />
              </div>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 btn-gradient text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-glow active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? t("login.submitting") : (
                  <>
                    {t("login.submit")}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {t("login.noAccount")}{" "}
            <Link to="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              {t("login.requestAccess")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
