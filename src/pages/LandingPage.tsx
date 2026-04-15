import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { HeroScene } from "@/components/hero/HeroScene";
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
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Gestão de Permits",
    desc: "Acompanhe solicitações, aprovações e renovações em um fluxo centralizado com histórico completo e alertas automáticos.",
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    icon: Users,
    title: "Clientes & Portal",
    desc: "Base completa de clientes com portal dedicado para acompanhamento de permits, documentos e comunicação em tempo real.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Truck,
    title: "Frota & Caminhões",
    desc: "Cadastro detalhado de veículos, motoristas e documentações com validade monitorada automaticamente.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Bot,
    title: "Assistente com IA",
    desc: "Gere relatórios, analise compliance e receba recomendações inteligentes com um assistente integrado ao seu fluxo.",
    gradient: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: Kanban,
    title: "Tarefas & Kanban",
    desc: "Organize operações em quadros visuais com workloads por colaborador, prazos e prioridades claras.",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: Calendar,
    title: "Agenda Integrada",
    desc: "Visualize vencimentos, reuniões e prazos em um calendário unificado com lembretes configuráveis.",
    gradient: "from-rose-500 to-red-500",
  },
  {
    icon: BarChart3,
    title: "Relatórios Avançados",
    desc: "Dashboards ricos, exportação em PDF e métricas em tempo real para tomada de decisão orientada por dados.",
    gradient: "from-sky-500 to-blue-500",
  },
  {
    icon: DollarSign,
    title: "Financeiro",
    desc: "Controle receitas, despesas e faturamento por cliente com relatórios financeiros integrados.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: MessageSquare,
    title: "Comunicação",
    desc: "Mensagens internas, comentários em permits e notas colaborativas para manter todo o time alinhado.",
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    icon: Shield,
    title: "Compliance & Auditoria",
    desc: "Trilha completa de auditoria, controle de permissões e histórico imutável para auditorias e compliance.",
    gradient: "from-slate-500 to-zinc-500",
  },
  {
    icon: Bell,
    title: "Alertas Inteligentes",
    desc: "Notificações automáticas para vencimentos, pendências e eventos críticos — nunca perca um prazo.",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    icon: Activity,
    title: "Workload & Produtividade",
    desc: "Visualize a carga de trabalho da equipe, redistribua tarefas e aumente a produtividade com dados reais.",
    gradient: "from-cyan-500 to-sky-500",
  },
];

const workflow = [
  {
    step: "01",
    title: "Cadastre clientes e frota",
    desc: "Onboarding guiado para clientes, caminhões e documentações em poucos minutos.",
  },
  {
    step: "02",
    title: "Gerencie permits e tarefas",
    desc: "Organize solicitações, aprovações e prazos com quadros Kanban e calendário integrado.",
  },
  {
    step: "03",
    title: "Monitore e decida com IA",
    desc: "Dashboards, relatórios e recomendações inteligentes para operar com excelência.",
  },
];

export default function LandingPage() {
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
                Recursos
              </a>
              <a href="#workflow" className="hover:text-foreground transition-colors">
                Como funciona
              </a>
              <a href="#why" className="hover:text-foreground transition-colors">
                Por que escolher
              </a>
              <a href="#cta" className="hover:text-foreground transition-colors">
                Começar
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden sm:inline-flex h-9 px-4 items-center rounded-lg text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors"
              >
                Entrar
              </Link>
              <Link
                to="/signup"
                className="inline-flex h-9 px-4 items-center gap-1.5 rounded-lg btn-gradient text-white text-sm font-semibold hover:shadow-[0_10px_30px_-8px_hsl(234_75%_58%/0.55)] transition-all"
              >
                Solicitar acesso
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
              Plataforma completa para gestão de permits e compliance
            </span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-[84px] font-bold leading-[1.02] gradient-text max-w-5xl mx-auto animate-fade-in">
            A operação do seu
            <br />
            transporte rodoviário,
            <br />
            <span className="relative inline-block">
              sob controle total.
              <span className="absolute -bottom-2 left-0 right-0 h-[6px] bg-gradient-to-r from-primary via-purple-500 to-accent rounded-full blur-sm opacity-70" />
            </span>
          </h1>

          <p
            className="mt-8 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            Gerencie permits, clientes, frota e compliance em um só lugar — com IA, automações e
            relatórios inteligentes que simplificam o dia a dia da sua operação.
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
              Solicitar acesso gratuito
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto h-12 px-7 rounded-xl inline-flex items-center justify-center gap-2 text-white font-semibold bg-white/5 border border-white/15 backdrop-blur-md hover:bg-white/10 transition-all"
            >
              Já tenho conta
            </Link>
          </div>

          {/* Hero stats */}
          <div
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            {[
              { v: "99.9%", l: "Uptime" },
              { v: "24/7", l: "Suporte" },
              { v: "IA", l: "Integrada" },
              { v: "100%", l: "Compliance" },
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
                      { v: "128", l: "Permits ativos", c: "from-indigo-500 to-violet-500" },
                      { v: "24", l: "Vencendo", c: "from-amber-500 to-orange-500" },
                      { v: "96%", l: "Aprovados", c: "from-emerald-500 to-teal-500" },
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
              <span className="text-xs font-semibold text-primary">Recursos</span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Tudo que você precisa em{" "}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
                uma única plataforma
              </span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Do onboarding do cliente até o relatório final — cada etapa da sua operação em um
              fluxo integrado e inteligente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
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
                <h3 className="font-display text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
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
              <span className="text-xs font-semibold text-primary">Como funciona</span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              3 passos para transformar sua operação
            </h2>
            <p className="text-muted-foreground text-lg">
              Comece em minutos e veja resultados desde o primeiro dia.
            </p>
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
                <h3 className="font-display text-xl font-bold mb-2">{w.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{w.desc}</p>
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
                <span className="text-xs font-semibold text-primary">Por que MartinsAdviser</span>
              </div>
              <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                Feito para transportadoras que{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  não podem errar
                </span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Cada recurso foi pensado para reduzir tempo manual, evitar falhas de compliance e
                dar visibilidade total sobre sua operação.
              </p>

              <div className="space-y-4">
                {[
                  {
                    icon: Zap,
                    title: "Produtividade 3x maior",
                    desc: "Automatize tarefas repetitivas e foque no que importa.",
                  },
                  {
                    icon: Lock,
                    title: "Segurança de nível empresarial",
                    desc: "Controle de permissões, auditoria e criptografia em todas as camadas.",
                  },
                  {
                    icon: TrendingUp,
                    title: "Decisões orientadas por dados",
                    desc: "Dashboards e relatórios com IA para enxergar além dos números.",
                  },
                  {
                    icon: Globe,
                    title: "Acesso de qualquer lugar",
                    desc: "100% web, responsivo e multi-idioma (PT, EN, ES).",
                  },
                ].map((b) => (
                  <div key={b.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <b.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{b.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
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
                    <div className="font-display font-bold">Assistente IA</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Online agora
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="ml-auto max-w-[85%] bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                    Qual o status dos permits vencendo esta semana?
                  </div>
                  <div className="max-w-[90%] bg-muted/60 rounded-2xl rounded-tl-sm px-4 py-3 text-sm space-y-2">
                    <p>Identifiquei <b>12 permits</b> com vencimento nos próximos 7 dias:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 8 já em
                        renovação
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> 4 pendentes — devo
                        priorizar?
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
                    analisando sua base...
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
            Pronto para transformar sua operação?
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-10">
            Solicite seu acesso e descubra como a MartinsAdviser pode simplificar a gestão de
            permits, compliance e todo o ciclo operacional.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="group w-full sm:w-auto h-12 px-8 btn-gradient text-white font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-all hover:shadow-[0_12px_40px_-10px_hsl(234_75%_58%/0.7)] active:scale-[0.98] relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              Solicitar acesso
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto h-12 px-8 rounded-xl inline-flex items-center justify-center gap-2 text-white font-semibold bg-white/5 border border-white/15 backdrop-blur-md hover:bg-white/10 transition-all"
            >
              Entrar
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
            © {new Date().getFullYear()} MartinsAdviser · Todos os direitos reservados
          </p>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">
              Entrar
            </Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">
              Solicitar acesso
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
