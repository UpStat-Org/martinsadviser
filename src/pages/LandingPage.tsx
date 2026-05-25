import { Link } from "react-router-dom";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ShieldCheck,
  Bell,
  Palette,
  Globe2,
  CreditCard,
  CheckCircle2,
  ChevronDown,
  Menu,
  X,
  BarChart3,
  Bot,
  Users,
  FileCheck,
  Truck,
  Mail,
  ClipboardList,
  Sparkles,
  Calendar,
  ScrollText,
  Activity,
} from "lucide-react";
import printDashboard from "@/images/print_1.png";
import printTasks from "@/images/print_2.png";
import printBranding from "@/images/print_3.png";

// CRM landing for permit-services agencies. Same visual language as the
// internal app: Inter, 6px radii, neutral surfaces, no aurora/mesh/orb.
// Real product screenshots carry the weight — copy keeps short and direct.

// Marketing surfaces stay on the MartinsAdviser brand colors. The OrgProvider
// also writes to `document.documentElement.style` when a tenant has custom
// branding, which would leak its primary/accent into the landing. Pinning
// the tokens on the landing root overrides those at the cascade level and
// keeps `/lp` (and the apex `/`) visually consistent across every tenant.
const LANDING_THEME: React.CSSProperties = {
  // Light mode + locked palette. Tenant branding inherits from
  // `document.documentElement`; redeclaring here wins for everything inside.
  "--brand-h": "232",
  "--background": "220 20% 99%",
  "--foreground": "222 30% 12%",
  "--card": "0 0% 100%",
  "--card-foreground": "222 30% 12%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "222 30% 12%",
  "--primary": "232 73% 56%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "220 14% 96%",
  "--secondary-foreground": "222 24% 20%",
  "--muted": "220 14% 96%",
  "--muted-foreground": "220 12% 44%",
  "--accent": "38 90% 50%",
  "--accent-foreground": "38 92% 12%",
  "--destructive": "0 72% 50%",
  "--destructive-foreground": "0 0% 100%",
  "--success": "158 60% 38%",
  "--success-foreground": "0 0% 100%",
  "--border": "220 14% 90%",
  "--input": "220 14% 90%",
  "--ring": "232 73% 56%",
  "--chart-1": "232 73% 56%",
  "--sidebar-primary": "232 73% 56%",
  "--sidebar-accent": "220 14% 95%",
  "--sidebar-accent-foreground": "222 28% 16%",
  colorScheme: "light",
} as React.CSSProperties;

export default function LandingPage() {
  return (
    // `style` pins the brand tokens; `bg-background text-foreground` then
    // resolve to the pinned values via the same CSS vars.
    <div className="min-h-screen bg-background text-foreground" style={LANDING_THEME}>
      <Navbar />
      <Hero />
      <ValueProps />
      <FeatureDashboard />
      <FeatureTasks />
      <FeatureWhiteLabel />
      <Included />
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
  const [open, setOpen] = useState(false);
  const links = [
    { href: "#features", label: t("lp.nav.features") },
    { href: "#white-label", label: t("lp.nav.whitelabel") },
    { href: "#pricing", label: t("lp.nav.pricing") },
    { href: "#faq", label: t("lp.nav.faq") },
  ];

  return (
    <header className="sticky top-0 inset-x-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav className="h-14 flex items-center justify-between">
          <Link to="/lp" className="flex items-center gap-2.5">
            <Logo className="w-7 h-7 rounded" />
            <Wordmark size="md" tone="dark" />
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:inline-flex h-8 px-3 items-center rounded-md text-sm text-foreground hover:bg-muted transition-colors"
            >
              {t("lp.nav.signin")}
            </Link>
            <Link
              to="/start"
              className="inline-flex h-8 px-3.5 items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {t("lp.nav.start")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              className="md:hidden h-8 w-8 inline-flex items-center justify-center rounded-md text-foreground hover:bg-muted"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>
        {open && (
          <div className="md:hidden pb-4 pt-2 space-y-1 border-t border-border">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

// ============================================================================
// Hero — short, screenshot leads
// ============================================================================

function Hero() {
  const { t } = useLanguage();
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center max-w-3xl mx-auto">
          <Eyebrow>{t("lp2.hero.eyebrow")}</Eyebrow>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.1]">
            {t("lp2.hero.title1")}{" "}
            <span className="text-primary">{t("lp2.hero.title2")}</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {t("lp2.hero.subtitle")}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link
              to="/start"
              className="h-10 px-5 rounded-md bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              {t("lp2.hero.cta")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="h-10 px-5 rounded-md border border-border bg-card text-foreground font-medium inline-flex items-center justify-center hover:bg-muted transition-colors"
            >
              {t("lp2.hero.cta2")}
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("lp2.hero.noCard")}</p>
        </div>

        {/* Real screenshot — leads the hero */}
        <div className="mt-12 max-w-6xl mx-auto">
          <ScreenshotFrame src={printDashboard} alt="MartinsAdviser dashboard" />
        </div>

        {/* Stats strip — small, sits below the screenshot */}
        <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 max-w-3xl mx-auto border-t border-border pt-6">
          {[
            { v: "100%", l: t("lp2.stat.permits") },
            { v: "24/7", l: t("lp2.stat.alerts") },
            { v: "99.9%", l: t("lp2.stat.uptime") },
            { v: "14d", l: t("lp2.stat.support") },
          ].map((s) => (
            <div key={s.l} className="text-center sm:text-left">
              <dt className="text-2xl font-semibold tabular tracking-tight">{s.v}</dt>
              <dd className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
                {s.l}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// ============================================================================
// Value props — four short cards
// ============================================================================

function ValueProps() {
  const { t } = useLanguage();
  const items = [
    { icon: Bell, k: "1" },
    { icon: Activity, k: "2" },
    { icon: Palette, k: "3" },
    { icon: Users, k: "4" },
  ];
  return (
    <section className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
        <SectionHeading
          title={t("lp2.value.title")}
          subtitle={t("lp2.value.subtitle")}
        />
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((it) => (
            <div key={it.k} className="rounded-md border border-border bg-card p-5">
              <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-4">
                <it.icon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">
                {t(`lp2.value.${it.k}.title`)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`lp2.value.${it.k}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Feature 1 — Dashboard (screenshot right)
// ============================================================================

function FeatureDashboard() {
  const { t } = useLanguage();
  return (
    <section id="features" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <FeatureRow
          eyebrow={t("lp2.feat1.eyebrow")}
          title={t("lp2.feat1.title")}
          desc={t("lp2.feat1.desc")}
          bullets={[t("lp2.feat1.b1"), t("lp2.feat1.b2"), t("lp2.feat1.b3"), t("lp2.feat1.b4")]}
          icon={BarChart3}
          screenshot={printDashboard}
          alt="Dashboard com KPIs e compliance score"
          imageLeft={false}
        />
      </div>
    </section>
  );
}

// ============================================================================
// Feature 2 — Tasks board (screenshot left)
// ============================================================================

function FeatureTasks() {
  const { t } = useLanguage();
  return (
    <section className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <FeatureRow
          eyebrow={t("lp2.feat2.eyebrow")}
          title={t("lp2.feat2.title")}
          desc={t("lp2.feat2.desc")}
          bullets={[t("lp2.feat2.b1"), t("lp2.feat2.b2"), t("lp2.feat2.b3"), t("lp2.feat2.b4")]}
          icon={ClipboardList}
          screenshot={printTasks}
          alt="Kanban operacional com colunas de status"
          imageLeft={true}
        />
      </div>
    </section>
  );
}

// ============================================================================
// Feature 3 — White-label (screenshot right)
// ============================================================================

function FeatureWhiteLabel() {
  const { t } = useLanguage();
  return (
    <section id="white-label" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <FeatureRow
          eyebrow={t("lp2.feat3.eyebrow")}
          title={t("lp2.feat3.title")}
          desc={t("lp2.feat3.desc")}
          bullets={[t("lp2.feat3.b1"), t("lp2.feat3.b2"), t("lp2.feat3.b3"), t("lp2.feat3.b4")]}
          icon={Palette}
          screenshot={printBranding}
          alt="Painel de branding white-label"
          imageLeft={false}
        />
      </div>
    </section>
  );
}

// ============================================================================
// Included — feature checklist
// ============================================================================

function Included() {
  const { t } = useLanguage();
  const items: Array<{ icon: typeof FileCheck; k: string }> = [
    { icon: FileCheck, k: "permits" },
    { icon: Truck, k: "fleet" },
    { icon: Bell, k: "alerts" },
    { icon: Mail, k: "messages" },
    { icon: Users, k: "portal" },
    { icon: Bot, k: "ai" },
    { icon: ScrollText, k: "audit" },
    { icon: Calendar, k: "compliance" },
    { icon: ShieldCheck, k: "csa" },
    { icon: CreditCard, k: "finance" },
    { icon: BarChart3, k: "reports" },
    { icon: Globe2, k: "i18n" },
  ];
  return (
    <section className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
        <SectionHeading title={t("lp2.included.title")} />
        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {items.map((it) => (
            <li
              key={it.k}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3"
            >
              <span className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <it.icon className="w-4 h-4" />
              </span>
              <span className="text-sm text-foreground">{t(`lp2.included.${it.k}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ============================================================================
// Pricing — single tier
// ============================================================================

function Pricing() {
  const { t } = useLanguage();
  const featureKeys = ["feat1", "feat2", "feat3", "feat4", "feat5", "feat6", "feat7", "feat8"];
  return (
    <section id="pricing" className="border-b border-border">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-20">
        <SectionHeading
          eyebrow={t("lp.pricing.badge")}
          title={t("lp.pricing.title")}
          subtitle={t("lp.pricing.subtitle")}
        />

        <div className="mt-10 rounded-md border border-border bg-card p-6 sm:p-8">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl sm:text-5xl font-semibold tracking-tight tabular">$250</span>
            <span className="text-base text-muted-foreground">{t("lp.pricing.perMonth")}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t("lp.pricing.perOrg")}</p>
          <p className="text-xs text-primary mt-2 font-medium">{t("lp.pricing.trialPill")}</p>

          <ul className="mt-6 space-y-2.5">
            {featureKeys.map((k) => (
              <li key={k} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span className="text-foreground/85">{t(`lp.pricing.${k}`)}</span>
              </li>
            ))}
          </ul>

          <Link
            to="/start"
            className="mt-7 w-full h-10 inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("lp.pricing.cta")}
            <ArrowRight className="w-4 h-4" />
          </Link>
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
    <section id="faq" className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-20">
        <SectionHeading eyebrow="FAQ" title={t("lp.faq.title")} center />
        <div className="mt-10 rounded-md border border-border bg-card divide-y divide-border">
          {items.map((k, i) => {
            const isOpen = open === i;
            return (
              <div key={k}>
                <button
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-muted/40 transition-colors"
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="text-sm font-medium text-foreground">{t(`lp.faq.${k}.q`)}</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
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
    <section className="border-b border-border">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
          {t("lp.cta.title")}
        </h2>
        <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
          {t("lp.cta.subtitle")}
        </p>
        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link
            to="/start"
            className="h-10 px-5 rounded-md bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            {t("lp.cta.primary")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="h-10 px-5 rounded-md border border-border bg-card text-foreground font-medium inline-flex items-center justify-center hover:bg-muted transition-colors"
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
    <footer className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo className="w-6 h-6 rounded" />
          <Wordmark size="sm" tone="dark" />
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} — {t("lp.footer.tagline")}
        </p>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link to="/login" className="hover:text-foreground transition-colors">
            {t("lp.nav.signin")}
          </Link>
          <Link to="/start" className="hover:text-foreground transition-colors">
            {t("lp.nav.start")}
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// Shared bits
// ============================================================================

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-[11px] font-medium uppercase tracking-wider text-primary">
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div className={cn(center ? "text-center max-w-2xl mx-auto" : "max-w-2xl")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

/**
 * Browser-chrome frame around a product screenshot. The frame anchors the
 * image visually so it reads as a real app capture rather than a stock
 * graphic. Width caps at the section content width.
 */
function ScreenshotFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden shadow-soft-lg">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
        </div>
        <div className="flex-1 mx-3 h-6 rounded bg-background border border-border flex items-center px-2.5">
          <Globe2 className="w-3 h-3 text-muted-foreground mr-1.5" />
          <span className="text-[11px] font-mono text-foreground/80">
            martinsadviser<span className="text-muted-foreground">.com</span>
          </span>
        </div>
      </div>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="block w-full h-auto"
      />
    </div>
  );
}

/**
 * Two-column feature row with copy on one side and a real screenshot on
 * the other. `imageLeft` controls layout — alternating left/right keeps
 * the scroll rhythm visually engaging without animation gimmicks.
 */
function FeatureRow({
  eyebrow,
  title,
  desc,
  bullets,
  icon: Icon,
  screenshot,
  alt,
  imageLeft,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  desc: React.ReactNode;
  bullets: React.ReactNode[];
  icon: typeof Sparkles;
  screenshot: string;
  alt: string;
  imageLeft: boolean;
}) {
  const copy = (
    <div className="max-w-xl">
      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-medium uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" />
        {eyebrow}
      </div>
      <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
        {title}
      </h2>
      <p className="mt-3 text-base text-muted-foreground leading-relaxed">{desc}</p>
      <ul className="mt-6 space-y-2.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );

  const image = <ScreenshotFrame src={screenshot} alt={alt} />;

  return (
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
      {imageLeft ? (
        <>
          <div className="order-2 lg:order-1">{image}</div>
          <div className="order-1 lg:order-2">{copy}</div>
        </>
      ) : (
        <>
          <div>{copy}</div>
          <div>{image}</div>
        </>
      )}
    </div>
  );
}
