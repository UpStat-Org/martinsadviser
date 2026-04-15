import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { HeroScene } from "@/components/hero/HeroScene";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Truck,
  Shield,
  BarChart3,
  Users,
  Clock,
  FileText,
  MessageSquare,
  Calendar,
  Kanban,
  DollarSign,
  Bot,
  Bell,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  Globe,
  TrendingUp,
  Activity,
  Star,
  MousePointerClick,
} from "lucide-react";

export default function LandingPage() {
  const { t } = useLanguage();

  const features = [
    { icon: FileText, k: "permits", gradient: "from-indigo-500 to-violet-500" },
    { icon: Users, k: "clients", gradient: "from-blue-500 to-cyan-500" },
    { icon: Truck, k: "fleet", gradient: "from-emerald-500 to-teal-500" },
    { icon: Bot, k: "ai", gradient: "from-fuchsia-500 to-pink-500" },
    { icon: Kanban, k: "kanban", gradient: "from-orange-500 to-amber-500" },
    { icon: Calendar, k: "calendar", gradient: "from-rose-500 to-red-500" },
    { icon: BarChart3, k: "reports", gradient: "from-sky-500 to-blue-500" },
    { icon: DollarSign, k: "finance", gradient: "from-green-500 to-emerald-500" },
    { icon: MessageSquare, k: "comms", gradient: "from-purple-500 to-indigo-500" },
    { icon: Shield, k: "compliance", gradient: "from-slate-500 to-zinc-500" },
    { icon: Bell, k: "alerts", gradient: "from-yellow-500 to-orange-500" },
    { icon: Activity, k: "workload", gradient: "from-cyan-500 to-sky-500" },
  ];

  const workflow = [
    { step: "01", k: "1" },
    { step: "02", k: "2" },
    { step: "03", k: "3" },
  ];

  const whyBenefits = [
    { icon: MousePointerClick, k: "b5" },
    { icon: Zap, k: "b1" },
    { icon: Lock, k: "b2" },
    { icon: TrendingUp, k: "b3" },
    { icon: Globe, k: "b4" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ============ NAVBAR ============ */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <nav className="glass-card-premium rounded-2xl px-5 py-3 flex items-center justify-between">
            <Link to="/lp" className="flex items-center gap-3">
              <Logo className="w-9 h-9 rounded-xl shadow-sm" />
              <Wordmark size="md" tone="dark" />
            </Link>
            <div className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">
                {t("lp.nav.features")}
              </a>
              <a href="#workflow" className="hover:text-foreground transition-colors">
                {t("lp.nav.workflow")}
              </a>
              <a href="#why" className="hover:text-foreground transition-colors">
                {t("lp.nav.why")}
              </a>
              <a href="#cta" className="hover:text-foreground transition-colors">
                {t("lp.nav.start")}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden sm:inline-flex h-9 px-4 items-center rounded-lg text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors"
              >
                {t("lp.nav.signin")}
              </Link>
              <Link
                to="/signup"
                className="inline-flex h-9 px-4 items-center gap-1.5 rounded-lg btn-gradient text-white text-sm font-semibold hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all"
              >
                {t("lp.nav.requestAccess")}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-[520px] h-[520px] bg-primary/30 top-1/4 -left-40 animate-pulse-glow" />
        <div
          className="orb w-[520px] h-[520px] bg-accent/20 bottom-0 -right-40 animate-pulse-glow"
          style={{ animationDelay: "1.5s" }}
        />

        <HeroScene />

        <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 backdrop-blur-md mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-white/80" />
            <span className="text-xs font-medium text-white/80 tracking-wide">
              {t("lp.hero.badge")}
            </span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-[84px] font-bold leading-[1.02] gradient-text max-w-5xl mx-auto animate-fade-in">
            {t("lp.hero.title1")}
            <br />
            {t("lp.hero.title2")}
            <br />
            <span className="relative inline-block">
              {t("lp.hero.title3")}
              <span className="absolute -bottom-2 left-0 right-0 h-[6px] bg-gradient-to-r from-primary via-purple-500 to-accent rounded-full blur-sm opacity-70" />
            </span>
          </h1>

          <p
            className="mt-8 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            {t("lp.hero.subtitle")}
          </p>

          <div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            <Link
              to="/signup"
              className="group w-full sm:w-auto h-12 px-7 btn-gradient text-white font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-all hover:shadow-[0_12px_40px_-10px_hsl(234_75%_58%/0.6)] active:scale-[0.98] relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {t("lp.hero.ctaPrimary")}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto h-12 px-7 rounded-xl inline-flex items-center justify-center gap-2 text-white font-semibold bg-white/5 border border-white/15 backdrop-blur-md hover:bg-white/10 transition-all"
            >
              {t("lp.hero.ctaSecondary")}
            </Link>
          </div>

          {/* Hero stats */}
          <div
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            {[
              { v: "99.9%", l: t("lp.hero.stat.uptime") },
              { v: "24/7", l: t("lp.hero.stat.support") },
              { v: t("lp.hero.stat.aiValue"), l: t("lp.hero.stat.aiLabel") },
              { v: "100%", l: t("lp.hero.stat.compliance") },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-display text-3xl sm:text-4xl font-bold gradient-text">
                  {s.v}
                </div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/60 mt-1">
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          {/* Mock preview */}
          <div
            className="mt-20 relative max-w-5xl mx-auto animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-purple-500/30 to-accent/30 rounded-3xl blur-2xl opacity-60" />
            <div className="relative rounded-2xl border border-white/10 bg-[#0b0d2e]/80 backdrop-blur-xl shadow-2xl p-2 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-white/10">
                <span className="w-3 h-3 rounded-full bg-red-400/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <span className="w-3 h-3 rounded-full bg-green-400/80" />
                <div className="ml-4 flex-1 h-5 rounded bg-white/5 max-w-xs" />
              </div>
              <div className="grid grid-cols-12 gap-3 p-4">
                <div className="col-span-3 space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-8 rounded-lg ${i === 1 ? "btn-gradient" : "bg-white/5"}`}
                    />
                  ))}
                </div>
                <div className="col-span-9 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { v: "128", l: t("lp.mock.permitsActive"), c: "from-indigo-500 to-violet-500" },
                      { v: "24", l: t("lp.mock.expiring"), c: "from-amber-500 to-orange-500" },
                      { v: "96%", l: t("lp.mock.approved"), c: "from-emerald-500 to-teal-500" },
                    ].map((k) => (
                      <div
                        key={k.l}
                        className="rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.c} mb-2`}
                        />
                        <div className="font-display text-2xl font-bold text-white">
                          {k.v}
                        </div>
                        <div className="text-[11px] text-white/60">{k.l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 h-40 flex items-end gap-2">
                    {[40, 65, 50, 75, 60, 85, 70, 90, 80, 95, 72, 88].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-md bg-gradient-to-t from-primary/60 to-accent/60"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="orb w-[500px] h-[500px] bg-primary/5 top-1/4 -left-40" />
        <div className="orb w-[500px] h-[500px] bg-accent/5 bottom-0 -right-40" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{t("lp.features.badge")}</span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              {t("lp.features.title1")}{" "}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
                {t("lp.features.title2")}
              </span>
            </h2>
            <p className="text-muted-foreground text-lg">{t("lp.features.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.k}
                className="group glass-card-premium rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden animate-fade-in"
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <div
                  className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${f.gradient} opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`}
                />
                <div
                  className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-lg`}
                >
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">{t(`lp.feat.${f.k}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`lp.feat.${f.k}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WORKFLOW ============ */}
      <section id="workflow" className="relative py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{t("lp.workflow.badge")}</span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              {t("lp.workflow.title")}
            </h2>
            <p className="text-muted-foreground text-lg">{t("lp.workflow.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            {workflow.map((w) => (
              <div
                key={w.step}
                className="relative glass-card-premium rounded-2xl p-7 text-center"
              >
                <div className="relative w-16 h-16 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full btn-gradient blur-md opacity-50" />
                  <div className="relative w-16 h-16 rounded-full btn-gradient flex items-center justify-center text-white font-display font-bold text-xl shadow-xl">
                    {w.step}
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold mb-2">{t(`lp.step.${w.k}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`lp.step.${w.k}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHY ============ */}
      <section id="why" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Star className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">{t("lp.why.badge")}</span>
              </div>
              <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                {t("lp.why.title1")}{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {t("lp.why.title2")}
                </span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                {t("lp.why.subtitle")}
              </p>

              <div className="space-y-4">
                {whyBenefits.map((b) => (
                  <div key={b.k} className="flex gap-4">
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <b.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{t(`lp.why.${b.k}.title`)}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t(`lp.why.${b.k}.desc`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-to-br from-primary/20 via-purple-500/10 to-accent/20 rounded-3xl blur-3xl" />
              <div className="relative glass-card-premium rounded-3xl p-8 shimmer-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl btn-gradient flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-display font-bold">{t("lp.ai.title")}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {t("lp.ai.status")}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="ml-auto max-w-[85%] bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                    {t("lp.ai.userMsg")}
                  </div>
                  <div className="max-w-[90%] bg-muted/60 rounded-2xl rounded-tl-sm px-4 py-3 text-sm space-y-2">
                    <p dangerouslySetInnerHTML={{ __html: t("lp.ai.botIntro") }} />
                    <ul className="space-y-1 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {t("lp.ai.botItem1")}
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> {t("lp.ai.botItem2")}
                      </li>
                    </ul>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                    <span className="flex gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse"
                        style={{ animationDelay: "0s" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </span>
                    {t("lp.ai.analyzing")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section id="cta" className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold gradient-text leading-tight mb-6">
            {t("lp.cta.title")}
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-10">{t("lp.cta.subtitle")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="group w-full sm:w-auto h-12 px-8 btn-gradient text-white font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-all hover:shadow-[0_12px_40px_-10px_hsl(234_75%_58%/0.7)] active:scale-[0.98] relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {t("lp.nav.requestAccess")}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto h-12 px-8 rounded-xl inline-flex items-center justify-center gap-2 text-white font-semibold bg-white/5 border border-white/15 backdrop-blur-md hover:bg-white/10 transition-all"
            >
              {t("lp.nav.signin")}
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="relative border-t border-border/60 py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo className="w-8 h-8 rounded-lg" />
            <Wordmark size="sm" tone="dark" />
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} MartinsAdviser · {t("lp.footer.rights")}
          </p>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">
              {t("lp.nav.signin")}
            </Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">
              {t("lp.nav.requestAccess")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
