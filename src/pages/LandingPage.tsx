import { Link } from "react-router-dom";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { LandingHeroScene } from "@/components/hero/LandingHeroScene";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  Bot,
  Users,
  FileCheck,
  BarChart3,
  Bell,
  Palette,
  Globe2,
  CreditCard,
  CheckCircle2,
  Zap,
  Building2,
  Briefcase,
  HeartHandshake,
  ChevronDown,
} from "lucide-react";

// Vertical SaaS pitch for permit-services agencies. All copy goes through
// the i18n layer (lp.* keys in src/lib/translations.ts) and the LP page
// itself stays presentational. CTAs route to /start (new org provisioning)
// or /login (existing tenants).

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <Hero />
      <Personas />
      <Features />
      <WhiteLabel />
      <HowItWorks />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

// ============================================================================
// Navbar
// ============================================================================

function Navbar() {
  const { t } = useLanguage();
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <nav className="glass-card-premium rounded-2xl px-5 py-3 flex items-center justify-between">
          <Link to="/lp" className="flex items-center gap-3">
            <Logo className="w-9 h-9 rounded-xl shadow-sm" />
            <Wordmark size="md" tone="dark" />
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">{t("lp.nav.features")}</a>
            <a href="#white-label" className="hover:text-foreground transition-colors">{t("lp.nav.whitelabel")}</a>
            <a href="#how" className="hover:text-foreground transition-colors">{t("lp.nav.how")}</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">{t("lp.nav.pricing")}</a>
            <a href="#faq" className="hover:text-foreground transition-colors">{t("lp.nav.faq")}</a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:inline-flex h-9 px-4 items-center rounded-lg text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors"
            >
              {t("lp.nav.signin")}
            </Link>
            <Link
              to="/start"
              className="inline-flex h-9 px-4 items-center gap-1.5 rounded-lg btn-gradient text-white text-sm font-semibold hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all"
            >
              {t("lp.nav.start")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

// ============================================================================
// Hero
// ============================================================================

function Hero() {
  const { t } = useLanguage();
  return (
    <section className="relative pt-36 pb-24 overflow-hidden">
      <div className="absolute inset-0 aurora-bg" />
      <div className="absolute inset-0 grid-pattern opacity-40" />
      <div className="absolute inset-0 noise-overlay" />
      <div className="orb w-[520px] h-[520px] bg-primary/30 top-1/4 -left-40 animate-pulse-glow" />
      <div
        className="orb w-[520px] h-[520px] bg-accent/20 bottom-0 -right-40 animate-pulse-glow"
        style={{ animationDelay: "1.5s" }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 backdrop-blur-md mb-8 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-white/80" />
              <span className="text-xs font-medium text-white/80 tracking-wide">
                {t("lp.hero.badge")}
              </span>
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-[80px] font-bold leading-[1.02] gradient-text max-w-5xl mx-auto lg:mx-0 animate-fade-in">
              {t("lp.hero.title1")}
              <br />
              {t("lp.hero.title2")}
            </h1>

            <p
              className="mt-8 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto lg:mx-0 leading-relaxed animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              {t("lp.hero.subtitle")}
            </p>

            <div
              className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              <Link
                to="/start"
                className="group w-full sm:w-auto h-12 px-7 btn-gradient text-white font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-all hover:shadow-[0_12px_40px_-10px_hsl(234_75%_58%/0.6)] active:scale-[0.98] relative overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {t("lp.hero.ctaPrimary")}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how"
                className="w-full sm:w-auto h-12 px-7 rounded-xl inline-flex items-center justify-center gap-2 text-white font-semibold bg-white/5 border border-white/15 backdrop-blur-md hover:bg-white/10 transition-all"
              >
                {t("lp.hero.ctaSecondary")}
              </a>
            </div>

            <p
              className="mt-5 text-xs text-white/50 tracking-wide animate-fade-in"
              style={{ animationDelay: "0.25s" }}
            >
              {t("lp.hero.noCard")}
            </p>

            <div
              className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto lg:mx-0 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              {[
                { v: "100%", l: t("lp.hero.stat.isolation") },
                { v: "3", l: t("lp.hero.stat.countries") },
                { v: "14d", l: t("lp.hero.stat.trial") },
                { v: "24/7", l: t("lp.hero.stat.compliance") },
              ].map((s) => (
                <div key={s.l} className="text-center lg:text-left">
                  <div className="font-display text-3xl sm:text-4xl font-bold gradient-text">
                    {s.v}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/60 mt-1">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative w-full max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <LandingHeroScene />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Personas
// ============================================================================

function Personas() {
  const { t } = useLanguage();
  const personas = [
    { icon: Building2, key: "p1", gradient: "from-indigo-500 to-violet-500" },
    { icon: Briefcase, key: "p2", gradient: "from-emerald-500 to-teal-500" },
    { icon: HeartHandshake, key: "p3", gradient: "from-amber-500 to-orange-500" },
  ] as const;

  return (
    <section className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge>{t("lp.personas.badge")}</Badge>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4 mt-4">
            {t("lp.personas.title1")}{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t("lp.personas.title2")}
            </span>
            .
          </h2>
          <p className="text-muted-foreground text-lg">{t("lp.personas.subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {personas.map((p, i) => (
            <div
              key={p.key}
              className="group glass-card-premium rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={cn("absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br opacity-10 blur-2xl group-hover:opacity-25 transition-opacity", p.gradient)} />
              <div className={cn("relative w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-5 shadow-lg", p.gradient)}>
                <p.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">{t(`lp.personas.${p.key}.title`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`lp.personas.${p.key}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Features
// ============================================================================

function Features() {
  const { t } = useLanguage();
  const features = [
    { icon: FileCheck, k: "permits", gradient: "from-indigo-500 to-violet-500" },
    { icon: Users, k: "clients", gradient: "from-blue-500 to-cyan-500" },
    { icon: Truck, k: "fleet", gradient: "from-emerald-500 to-teal-500" },
    { icon: Bot, k: "ai", gradient: "from-fuchsia-500 to-pink-500" },
    { icon: Bell, k: "alerts", gradient: "from-yellow-500 to-orange-500" },
    { icon: BarChart3, k: "dashboards", gradient: "from-sky-500 to-blue-500" },
    { icon: CreditCard, k: "billing", gradient: "from-green-500 to-emerald-500" },
    { icon: ShieldCheck, k: "audit", gradient: "from-slate-500 to-zinc-500" },
    { icon: Globe2, k: "countries", gradient: "from-rose-500 to-red-500" },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-32 bg-muted/30">
      <div className="orb w-[500px] h-[500px] bg-primary/5 top-1/4 -left-40" />
      <div className="orb w-[500px] h-[500px] bg-accent/5 bottom-0 -right-40" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge icon={Zap}>{t("lp.features.badge")}</Badge>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4 mt-4">
            {t("lp.features.title1")}{" "}
            <span className="bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
              {t("lp.features.title2")}
            </span>
            .
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
              <div className={cn("absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br opacity-10 blur-2xl group-hover:opacity-25 transition-opacity", f.gradient)} />
              <div className={cn("relative w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg", f.gradient)}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-display text-lg font-bold mb-2">{t(`lp.feat.${f.k}.title`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`lp.feat.${f.k}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// White-label
// ============================================================================

function WhiteLabel() {
  const { t } = useLanguage();
  const items = [
    { icon: Globe2, k: "item1" },
    { icon: Palette, k: "item2" },
    { icon: Users, k: "item3" },
    { icon: ShieldCheck, k: "item4" },
  ];

  return (
    <section id="white-label" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 aurora-bg opacity-60" />
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge tone="dark" icon={Palette}>{t("lp.wl.badge")}</Badge>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-5 mt-4 text-white">
              {t("lp.wl.title1")}{" "}
              <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                {t("lp.wl.title2")}
              </span>
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8">{t("lp.wl.subtitle")}</p>

            <div className="grid sm:grid-cols-2 gap-4">
              {items.map((it) => (
                <div key={it.k} className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-md">
                    <it.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-0.5">{t(`lp.wl.${it.k}.title`)}</div>
                    <p className="text-xs text-white/60 leading-relaxed">{t(`lp.wl.${it.k}.desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mock browser frame showing tenant subdomain */}
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-br from-primary/30 to-accent/20 blur-3xl rounded-3xl" />
            <div className="relative glass-card-premium rounded-2xl overflow-hidden shimmer-border">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <div className="flex-1 mx-4 h-7 rounded-md bg-background/60 border border-border/40 flex items-center px-3">
                  <Globe2 className="w-3 h-3 text-muted-foreground mr-2" />
                  <span className="text-[11px] font-mono text-foreground/80">
                    yourcompany<span className="text-muted-foreground">.app.com</span>
                  </span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                    YC
                  </div>
                  <div>
                    <div className="font-display font-bold text-sm">Your Company</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("lp.wl.mock.tag")}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: t("lp.feat.clients.title"), v: "42" },
                    { l: t("lp.feat.permits.title").split(" ")[0], v: "318" },
                    { l: t("lp.feat.fleet.title"), v: "97" },
                  ].map((row) => (
                    <div key={row.l} className="rounded-lg bg-muted/40 border border-border/40 px-3 py-2">
                      <div className="text-[10px] uppercase text-muted-foreground truncate">{row.l}</div>
                      <div className="font-display font-bold text-lg tabular-nums">{row.v}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-muted/40 border border-border/40 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t("lp.wl.mock.dueWeek")}</span>
                    <span className="font-semibold text-amber-500">{t("lp.wl.mock.thisWeek")}</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-1.5 flex-1 rounded-full bg-emerald-500" />
                    <div className="h-1.5 flex-1 rounded-full bg-amber-500" />
                    <div className="h-1.5 flex-1 rounded-full bg-rose-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// How it works
// ============================================================================

function HowItWorks() {
  const { t } = useLanguage();
  const steps = [
    { step: "01", k: "step1" },
    { step: "02", k: "step2" },
    { step: "03", k: "step3" },
  ];
  return (
    <section id="how" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge>{t("lp.how.badge")}</Badge>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4 mt-4">
            {t("lp.how.title1")}{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t("lp.how.title2")}
            </span>
            .
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          {steps.map((s) => (
            <div key={s.step} className="relative glass-card-premium rounded-2xl p-7 text-center">
              <div className="relative w-16 h-16 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full btn-gradient blur-md opacity-50" />
                <div className="relative w-16 h-16 rounded-full btn-gradient flex items-center justify-center text-white font-display font-bold text-xl shadow-xl">
                  {s.step}
                </div>
              </div>
              <h3 className="font-display text-xl font-bold mb-2">{t(`lp.how.${s.k}.title`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`lp.how.${s.k}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Pricing
// ============================================================================

function Pricing() {
  const { t } = useLanguage();
  const featureKeys = ["feat1", "feat2", "feat3", "feat4", "feat5", "feat6", "feat7", "feat8"];
  return (
    <section id="pricing" className="relative py-24 sm:py-32 bg-muted/30">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge icon={CreditCard}>{t("lp.pricing.badge")}</Badge>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4 mt-4">
            {t("lp.pricing.title")}
          </h2>
          <p className="text-muted-foreground text-lg">{t("lp.pricing.subtitle")}</p>
        </div>

        <div className="relative max-w-xl mx-auto">
          <div className="absolute -inset-6 bg-gradient-to-br from-primary/20 via-purple-500/10 to-accent/20 rounded-3xl blur-3xl" />
          <div className="relative glass-card-premium rounded-3xl p-8 sm:p-10 shimmer-border">
            <div className="text-center mb-7">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">{t("lp.pricing.trialPill")}</span>
              </div>
              <div className="font-display text-6xl sm:text-7xl font-bold gradient-text">
                $250<span className="text-2xl text-muted-foreground font-normal">{t("lp.pricing.perMonth")}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{t("lp.pricing.perOrg")}</p>
            </div>

            <div className="space-y-2.5 mb-8">
              {featureKeys.map((k) => (
                <div key={k} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t(`lp.pricing.${k}`)}</span>
                </div>
              ))}
            </div>

            <Link
              to="/start"
              className="block w-full text-center h-12 btn-gradient text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_12px_40px_-10px_hsl(234_75%_58%/0.6)] transition-all"
            >
              {t("lp.pricing.cta")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ
// ============================================================================

function Faq() {
  const { t } = useLanguage();
  const items = ["q1", "q2", "q3", "q4", "q5", "q6"];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-12">
          <Badge>FAQ</Badge>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4 mt-4">{t("lp.faq.title")}</h2>
        </div>
        <div className="space-y-3">
          {items.map((k, i) => {
            const isOpen = open === i;
            return (
              <div key={k} className="glass-card-premium rounded-2xl overflow-hidden">
                <button
                  className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="font-semibold text-base">{t(`lp.faq.${k}.q`)}</span>
                  <ChevronDown
                    className={cn("w-5 h-5 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed">
                    {t(`lp.faq.${k}.a`)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Final CTA
// ============================================================================

function FinalCta() {
  const { t } = useLanguage();
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
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
            to="/start"
            className="group w-full sm:w-auto h-12 px-8 btn-gradient text-white font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-all hover:shadow-[0_12px_40px_-10px_hsl(234_75%_58%/0.7)] active:scale-[0.98] relative overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            {t("lp.cta.primary")}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto h-12 px-8 rounded-xl inline-flex items-center justify-center gap-2 text-white font-semibold bg-white/5 border border-white/15 backdrop-blur-md hover:bg-white/10 transition-all"
          >
            {t("lp.cta.secondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Footer
// ============================================================================

function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="relative border-t border-border/60 py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Logo className="w-8 h-8 rounded-lg" />
          <Wordmark size="sm" tone="dark" />
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} — {t("lp.footer.tagline")}
        </p>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link to="/login" className="hover:text-foreground transition-colors">{t("lp.nav.signin")}</Link>
          <Link to="/start" className="hover:text-foreground transition-colors">{t("lp.nav.start")}</Link>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// Shared badge
// ============================================================================

function Badge({
  children,
  icon: Icon,
  tone = "light",
}: {
  children: React.ReactNode;
  icon?: typeof Sparkles;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        tone === "dark"
          ? "bg-white/10 border border-white/20 text-white"
          : "bg-primary/10 border border-primary/20 text-primary",
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span className="text-xs font-semibold uppercase tracking-wider">{children}</span>
    </div>
  );
}
