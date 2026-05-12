import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck,
  Gauge,
  History,
  Layers,
  LockKeyhole,
  MessageSquare,
  MonitorSmartphone,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type Item = {
  icon: typeof Sparkles;
  title: string;
  desc: string;
  tone: string;
};

const outcomes: Item[] = [
  { icon: Layers, title: "presentation.outcome1.title", desc: "presentation.outcome1.desc", tone: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20" },
  { icon: Gauge, title: "presentation.outcome2.title", desc: "presentation.outcome2.desc", tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { icon: MessageSquare, title: "presentation.outcome3.title", desc: "presentation.outcome3.desc", tone: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
  { icon: ShieldCheck, title: "presentation.outcome4.title", desc: "presentation.outcome4.desc", tone: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
];

const workflow: Item[] = [
  { icon: Users, title: "presentation.workflow1.title", desc: "presentation.workflow1.desc", tone: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20" },
  { icon: FileCheck, title: "presentation.workflow2.title", desc: "presentation.workflow2.desc", tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { icon: ClipboardList, title: "presentation.workflow3.title", desc: "presentation.workflow3.desc", tone: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
  { icon: MessageSquare, title: "presentation.workflow4.title", desc: "presentation.workflow4.desc", tone: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
  { icon: History, title: "presentation.workflow5.title", desc: "presentation.workflow5.desc", tone: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
];

const differentials: Item[] = [
  { icon: Wand2, title: "presentation.diff1.title", desc: "presentation.diff1.desc", tone: "text-fuchsia-600 bg-fuchsia-500/10 border-fuchsia-500/20" },
  { icon: MonitorSmartphone, title: "presentation.diff2.title", desc: "presentation.diff2.desc", tone: "text-cyan-600 bg-cyan-500/10 border-cyan-500/20" },
  { icon: Clock, title: "presentation.diff3.title", desc: "presentation.diff3.desc", tone: "text-orange-600 bg-orange-500/10 border-orange-500/20" },
  { icon: Bot, title: "presentation.diff4.title", desc: "presentation.diff4.desc", tone: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20" },
  { icon: LockKeyhole, title: "presentation.diff5.title", desc: "presentation.diff5.desc", tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { icon: Gauge, title: "presentation.diff6.title", desc: "presentation.diff6.desc", tone: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
];

const employeeBenefits: Item[] = [
  { icon: CheckCircle2, title: "presentation.employee1.title", desc: "presentation.employee1.desc", tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { icon: Sparkles, title: "presentation.employee2.title", desc: "presentation.employee2.desc", tone: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
  { icon: CalendarDays, title: "presentation.employee3.title", desc: "presentation.employee3.desc", tone: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
  { icon: ShieldCheck, title: "presentation.employee4.title", desc: "presentation.employee4.desc", tone: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
];

const comparisonRows = [1, 2, 3, 4, 5];
const rolloutRows = [1, 2, 3];

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      {subtitle && <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function FeatureCard({ item }: { item: Item }) {
  const { t } = useLanguage();
  const Icon = item.icon;
  return (
    <Card className="rounded-lg border-border/60 bg-card/90 shadow-sm">
      <CardContent className="p-5">
        <div className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-lg border", item.tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-display text-base font-bold text-foreground">{t(item.title)}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(item.desc)}</p>
      </CardContent>
    </Card>
  );
}

export default function PresentationPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/presentation" className="flex items-center gap-3">
            <Logo className="h-9 w-9 rounded-lg shadow-sm" />
            <Wordmark size="md" tone="dark" />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/login">{t("presentation.login")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.16),transparent_28%),radial-gradient(circle_at_78%_18%,hsl(158_55%_42%/0.13),transparent_26%),radial-gradient(circle_at_55%_78%,hsl(36_92%_52%/0.12),transparent_30%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <div className="flex flex-col justify-center">
              <Badge className="mb-5 w-fit rounded-md bg-primary/10 text-primary hover:bg-primary/10">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {t("presentation.hero.badge")}
              </Badge>
              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {t("presentation.hero.title")}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("presentation.hero.subtitle")}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-lg">
                  <a href="#workflow">
                    {t("presentation.hero.primary")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-lg">
                  <a href="#comparison">{t("presentation.hero.secondary")}</a>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-lg border border-border/70 bg-card shadow-2xl">
                <div className="border-b border-border/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        MartinsAdviser
                      </p>
                      <h2 className="mt-1 font-display text-xl font-bold">{t("presentation.hero.panelTitle")}</h2>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Gauge className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="rounded-lg border border-border/60 bg-muted/30 p-4">
                      <div className="mb-3 h-2 w-16 rounded-full bg-primary/30" />
                      <p className="text-sm font-semibold">{t(`presentation.hero.metric${n}`)}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 border-t border-border/60 p-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-indigo-500/10 p-4 text-indigo-700">
                    <FileCheck className="mb-3 h-5 w-5" />
                    <div className="text-2xl font-bold">94%</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-4 text-emerald-700">
                    <Clock className="mb-3 h-5 w-5" />
                    <div className="text-2xl font-bold">30d</div>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-4 text-amber-700">
                    <Receipt className="mb-3 h-5 w-5" />
                    <div className="text-2xl font-bold">360</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("presentation.story.eyebrow")}
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold">{t("presentation.story.title")}</h2>
            </div>
            <Card className="rounded-lg border-border/60">
              <CardContent className="space-y-4 p-6">
                <p className="text-sm leading-relaxed text-muted-foreground">{t("presentation.story.body1")}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{t("presentation.story.body2")}</p>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  {t("presentation.story.note")}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <SectionTitle title={t("presentation.outcomes.title")} />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {outcomes.map((item) => <FeatureCard key={item.title} item={item} />)}
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionTitle title={t("presentation.workflow.title")} subtitle={t("presentation.workflow.subtitle")} />
          <div className="mt-8 grid gap-4 lg:grid-cols-5">
            {workflow.map((item, index) => (
              <div key={item.title} className="relative rounded-lg border border-border/60 bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", item.tone)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="font-display text-base font-bold">{t(item.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(item.desc)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <SectionTitle title={t("presentation.differentials.title")} />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {differentials.map((item) => <FeatureCard key={item.title} item={item} />)}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionTitle title={t("presentation.employees.title")} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {employeeBenefits.map((item) => <FeatureCard key={item.title} item={item} />)}
          </div>
        </section>

        <section id="comparison" className="border-y border-border/60 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <SectionTitle title={t("presentation.compare.title")} subtitle={t("presentation.compare.subtitle")} />
            <div className="mt-8 overflow-hidden rounded-lg border border-border/60 bg-card">
              <div className="grid grid-cols-2 border-b border-border/60 bg-muted/50 text-sm font-bold">
                <div className="p-4">{t("presentation.compare.old")}</div>
                <div className="border-l border-border/60 p-4">{t("presentation.compare.new")}</div>
              </div>
              {comparisonRows.map((n) => (
                <div key={n} className="grid grid-cols-2 border-b border-border/60 last:border-b-0">
                  <div className="p-4 text-sm leading-relaxed text-muted-foreground">{t(`presentation.compare${n}.old`)}</div>
                  <div className="border-l border-border/60 p-4 text-sm font-medium leading-relaxed">{t(`presentation.compare${n}.new`)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionTitle title={t("presentation.rollout.title")} subtitle={t("presentation.rollout.subtitle")} />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {rolloutRows.map((n) => (
              <Card key={n} className="rounded-lg border-border/60">
                <CardContent className="p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-bold">{t(`presentation.rollout${n}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`presentation.rollout${n}.desc`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border/60">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-foreground p-8 text-background sm:p-10">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <h2 className="font-display text-2xl font-bold sm:text-3xl">{t("presentation.close.title")}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-background/70 sm:text-base">{t("presentation.close.desc")}</p>
                </div>
                <Button asChild size="lg" variant="secondary" className="rounded-lg">
                  <Link to="/login">
                    {t("presentation.close.cta")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
