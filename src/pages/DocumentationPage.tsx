import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BookOpen, LayoutDashboard, Users, Truck, FileCheck, MessageSquare,
  CalendarDays, BarChart3, ClipboardList, DollarSign, Settings, Globe,
  ShieldCheck, Lightbulb, Info, ArrowRight, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { type ReactNode } from "react";

function Tip({ children, variant = "info" }: { children: ReactNode; variant?: "info" | "warning" }) {
  const isWarning = variant === "warning";
  return (
    <div
      className={`relative overflow-hidden flex gap-3 rounded-xl p-4 my-3 border ${
        isWarning
          ? "bg-amber-500/5 border-amber-500/20"
          : "bg-primary/5 border-primary/15"
      }`}
    >
      <div
        className={`absolute top-0 left-0 bottom-0 w-1 ${
          isWarning
            ? "bg-gradient-to-b from-amber-500 to-orange-500"
            : "bg-gradient-to-b from-indigo-500 to-violet-500"
        }`}
      />
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
          isWarning
            ? "bg-gradient-to-br from-amber-500 to-orange-500"
            : "bg-gradient-to-br from-indigo-500 to-violet-500"
        }`}
      >
        {isWarning ? (
          <AlertTriangle className="w-4 h-4 text-white" />
        ) : (
          <Lightbulb className="w-4 h-4 text-white" />
        )}
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed pt-0.5">{children}</p>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3 my-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 items-start group">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-xs font-bold shrink-0 mt-0.5 shadow-sm ring-2 ring-background group-hover:scale-105 transition-transform">
            {i + 1}
          </span>
          <span className="text-sm text-foreground leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function SectionIcon({ icon: Icon, color }: { icon: any; color: string }) {
  return (
    <div
      className={`flex items-center justify-center w-10 h-10 rounded-xl ${color} shrink-0 shadow-sm`}
    >
      <Icon className="w-5 h-5" />
    </div>
  );
}

interface DocSection {
  id: string;
  icon: any;
  color: string;
  title: string;
  description: string;
  steps: string[];
  tips: { text: string; variant?: "info" | "warning" }[];
}

export default function DocumentationPage() {
  const { t, language } = useLanguage();

  const sections: DocSection[] = language === "en" ? getEnSections() : language === "es" ? getEsSections() : getPtSections();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl flex-shrink-0">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
              {t("docs.title")}
            </h1>
            <p className="text-white/70 mt-2 text-sm sm:text-base max-w-xl">
              {t("docs.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ============ WELCOME ============ */}
      <Card className="border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 opacity-10 blur-2xl pointer-events-none" />
        <CardContent className="relative flex gap-4 items-start p-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-xl flex-shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-base mb-1">
              {t("docs.welcomeTitle")}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("docs.welcomeDesc")}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="inline-flex items-center h-6 px-2 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/15">
                {sections.length} seções
              </span>
              <span className="inline-flex items-center h-6 px-2 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Passo a passo
              </span>
              <span className="inline-flex items-center h-6 px-2 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Dicas
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ SECTIONS ============ */}
      <Accordion type="multiple" className="space-y-3">
        {sections.map((section, i) => (
          <AccordionItem
            key={section.id}
            value={section.id}
            className="border border-border/50 rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
          >
            <AccordionTrigger className="hover:no-underline px-5 py-4 group-data-[state=open]:border-b group-data-[state=open]:border-border/50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground font-bold text-[10px] shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <SectionIcon icon={section.icon} color={section.color} />
                <div className="text-left min-w-0">
                  <span className="font-display font-bold text-foreground text-[15px] truncate block">
                    {section.title}
                  </span>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5 truncate">
                    {section.description}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-4">
              <Steps items={section.steps} />
              {section.tips.map((tip, i) => (
                <Tip key={i} variant={tip.variant as any}>
                  {tip.text}
                </Tip>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// ─── PT ─────────────────────────────────────────────────────
function getPtSections(): DocSection[] {
  return [
    {
      id: "getting-started",
      icon: CheckCircle2,
      color: "bg-emerald-100 text-emerald-600",
      title: "Primeiros Passos",
      description: "Login, cadastro e aprovação de conta",
      steps: [
        "Acesse a tela de Login digitando seu email e senha cadastrados.",
        "Se ainda não tem conta, clique em 'Solicitar acesso' na tela de login para preencher o formulário de cadastro.",
        "Após preencher o cadastro, verifique seu email e clique no link de confirmação.",
        "Após confirmar, aguarde a aprovação do administrador. Você verá uma tela de 'Aguardando Aprovação'.",
        "Quando o administrador aprovar, você terá acesso completo ao sistema.",
      ],
      tips: [
        { text: "Guarde sua senha em um local seguro. Caso esqueça, entre em contato com o administrador." },
        { text: "Enquanto sua conta não for aprovada, você não conseguirá acessar nenhuma página do sistema.", variant: "warning" },
      ],
    },
    {
      id: "dashboard",
      icon: LayoutDashboard,
      color: "bg-blue-100 text-blue-600",
      title: "Dashboard",
      description: "Visão geral de métricas e alertas do sistema",
      steps: [
        "Ao fazer login, você será redirecionado automaticamente para o Dashboard.",
        "No topo, veja os cards de resumo: total de clientes, caminhões, permits ativos e vencendo em 30 dias.",
        "Logo abaixo, o gráfico de 'Resumo de Vencimentos' mostra a quantidade de permits por faixa de tempo (vencidos, 30d, 60d, 90d, válidos).",
        "O gráfico 'Permits por Tipo' exibe a distribuição (IRP, IFTA, UCR, etc.).",
        "A seção 'Permits Urgentes' lista todos os permits que vencem nos próximos 30 dias com destaque visual.",
        "No rodapé, veja os últimos clientes cadastrados para acesso rápido.",
      ],
      tips: [
        { text: "Clique em qualquer card de resumo ou item urgente para navegar diretamente à página correspondente." },
        { text: "Permits com menos de 7 dias para vencer aparecem em vermelho. Fique atento!", variant: "warning" },
      ],
    },
    {
      id: "clients",
      icon: Users,
      color: "bg-violet-100 text-violet-600",
      title: "Clientes",
      description: "Cadastro, busca, importação e gerenciamento de transportadoras",
      steps: [
        "Clique em 'Clientes' na barra lateral para ver a listagem de todos os clientes.",
        "Use a barra de busca para filtrar por nome, DOT, MC ou EIN.",
        "Para cadastrar um novo cliente, clique no botão 'Novo Cliente' no canto superior direito.",
        "Para o cadastro completo com caminhões e permits, use o botão de 'Onboarding' — um wizard passo a passo.",
        "Clique em qualquer cliente na lista para acessar a página de detalhes com todas as informações, caminhões e permits vinculados.",
        "Na página de detalhes, você pode editar dados, adicionar caminhões/permits, ver o histórico de atividades e convidar o cliente para o Portal.",
        "Para importar vários clientes de uma vez, use o botão 'Importar' e envie uma planilha Excel ou CSV.",
      ],
      tips: [
        { text: "O onboarding é ideal para novos clientes — ele guia você por todas as etapas: dados, serviços, caminhões e permits." },
        { text: "Na importação, verifique se a coluna 'Nome da Empresa' está corretamente mapeada. É o único campo obrigatório.", variant: "warning" },
      ],
    },
    {
      id: "trucks",
      icon: Truck,
      color: "bg-orange-100 text-orange-600",
      title: "Caminhões",
      description: "Gerenciamento da frota de cada cliente",
      steps: [
        "Acesse 'Caminhões' na barra lateral para ver todos os caminhões cadastrados.",
        "Use a busca para filtrar por placa, VIN ou marca.",
        "Clique em 'Novo Caminhão' para adicionar um veículo. Selecione o cliente dono e preencha placa, marca, modelo e ano.",
        "Para editar, clique no ícone de edição na linha do caminhão.",
        "Para remover, clique no ícone de lixeira — essa ação é irreversível.",
      ],
      tips: [
        { text: "Cada caminhão é vinculado a um cliente. Você também pode adicionar caminhões diretamente na página de detalhe do cliente." },
      ],
    },
    {
      id: "permits",
      icon: FileCheck,
      color: "bg-emerald-100 text-emerald-600",
      title: "Permits",
      description: "Cadastro, controle de vencimentos e status",
      steps: [
        "Acesse 'Permits' na barra lateral para ver todos os permits do sistema.",
        "Use as abas 'Todos', 'Ativos', 'Vencidos' e 'Pendentes' para filtrar por status.",
        "Clique em 'Novo Permit' para cadastrar. Selecione o cliente, tipo (IRP, IFTA, UCR, etc.), estado, data de vencimento e anexe o documento se disponível.",
        "O sistema calcula automaticamente o status com base na data de vencimento: Ativo (verde), Pendente (amarelo) ou Vencido (vermelho).",
        "Para editar ou remover, use os ícones de ação em cada linha.",
        "Acompanhe os vencimentos pelo Dashboard e pelo Calendário para nunca perder uma renovação.",
      ],
      tips: [
        { text: "Permits vencem automaticamente pela data. Mantenha sempre a data de vencimento atualizada." },
        { text: "Você pode anexar o documento PDF/imagem do permit para referência rápida.", variant: "info" },
      ],
    },
    {
      id: "messages",
      icon: MessageSquare,
      color: "bg-cyan-100 text-cyan-600",
      title: "Mensagens",
      description: "Templates, agendamento e automações de envio",
      steps: [
        "Acesse 'Mensagens' na barra lateral.",
        "Na aba 'Agendadas', veja todas as mensagens programadas para envio futuro. Clique em 'Nova Mensagem' para agendar uma.",
        "Na aba 'Enviadas', consulte o histórico de mensagens já enviadas com data e canal.",
        "Na aba 'Automações', crie regras automáticas: ex. 'Enviar email 30 dias antes do vencimento do permit'. O sistema monitora e envia automaticamente.",
        "Na aba 'Templates', crie modelos reutilizáveis de mensagens com placeholders como {empresa}, {vencimento}, etc.",
        "Ao agendar uma mensagem, você pode escolher entre enviar imediatamente ou agendar para uma data futura.",
      ],
      tips: [
        { text: "Automações economizam tempo — configure uma vez e o sistema cuida dos alertas de vencimento para você." },
        { text: "Templates com placeholders são preenchidos automaticamente com os dados do cliente na hora do envio." },
      ],
    },
    {
      id: "calendar",
      icon: CalendarDays,
      color: "bg-pink-100 text-pink-600",
      title: "Calendário",
      description: "Visualização de vencimentos e eventos por data",
      steps: [
        "Acesse 'Calendário' na barra lateral.",
        "O calendário exibe datas com vencimentos de permits marcadas com indicadores coloridos.",
        "Clique em qualquer data para ver quais permits vencem naquele dia.",
        "Na lateral, veja a lista dos próximos vencimentos em 30 dias com acesso rápido ao cliente e permit.",
        "Permits são classificados por cores: vermelho (vencido/urgente), amarelo (31-90 dias), verde (mais de 90 dias).",
      ],
      tips: [
        { text: "Use o calendário como sua ferramenta diária para planejar renovações e evitar atrasos." },
      ],
    },
    {
      id: "reports",
      icon: BarChart3,
      color: "bg-indigo-100 text-indigo-600",
      title: "Relatórios",
      description: "Exportação de dados em CSV e PDF",
      steps: [
        "Acesse 'Relatórios' na barra lateral.",
        "Escolha o tipo de relatório: por Status, por Tipo de permit ou por Cliente.",
        "Use os filtros (período, tipo, estado, cliente) para refinar os dados.",
        "Clique em 'Exportar CSV' para baixar uma planilha ou 'Exportar PDF' para gerar um documento formatado.",
        "Os relatórios incluem todos os permits filtrados com detalhes completos.",
      ],
      tips: [
        { text: "Relatórios em CSV são ideais para importar em Excel. PDF é melhor para compartilhar com clientes ou parceiros." },
        { text: "Você também pode gerar um relatório inteligente por IA clicando no botão 'Relatório IA' no Dashboard." },
      ],
    },
    {
      id: "kanban",
      icon: ClipboardList,
      color: "bg-amber-100 text-amber-600",
      title: "Tarefas (Kanban)",
      description: "Quadro de tarefas internas com prioridades",
      steps: [
        "Acesse 'Tarefas' na barra lateral para ver o quadro Kanban.",
        "As tarefas são organizadas em colunas: A Fazer, Em Andamento e Concluído.",
        "Clique em 'Nova Tarefa' para criar. Preencha título, descrição, prioridade e vincule a um cliente se aplicável.",
        "Arraste as tarefas entre colunas para atualizar o status ou clique para editar.",
        "Use tags e prioridades para organizar e filtrar as tarefas da equipe.",
      ],
      tips: [
        { text: "Vincule tarefas a clientes para manter o contexto. Ex: 'Renovar IFTA - TransLog Inc'." },
      ],
    },
    {
      id: "finance",
      icon: DollarSign,
      color: "bg-green-100 text-green-600",
      title: "Financeiro",
      description: "Faturas, cobranças e controle financeiro",
      steps: [
        "Acesse 'Financeiro' na barra lateral.",
        "No topo, veja os cards de resumo: Total a Receber, Total Recebido, Total Atrasado.",
        "Abaixo, os gráficos mostram a receita mensal e a distribuição por status.",
        "Clique em 'Nova Fatura' para criar. Selecione o cliente, valor, descrição e data de vencimento.",
        "Atualize o status da fatura: Pendente → Pago (com data de pagamento) ou Atrasado.",
        "Use os filtros para buscar faturas por cliente, status ou período.",
      ],
      tips: [
        { text: "Faturas atrasadas aparecem em destaque. Acompanhe regularmente para manter a saúde financeira." },
      ],
    },
    {
      id: "settings",
      icon: Settings,
      color: "bg-slate-100 text-slate-600",
      title: "Configurações",
      description: "Integrações com WhatsApp, SMS, Email e Calendar",
      steps: [
        "Acesse 'Configurações' na barra lateral.",
        "Configure a integração com WhatsApp API para enviar mensagens diretamente pelo sistema.",
        "Configure o provedor de SMS para alertas por mensagem de texto.",
        "Configure o provedor de Email para envios automáticos e agendados.",
        "Conecte o Google Calendar para sincronizar vencimentos automaticamente.",
      ],
      tips: [
        { text: "Cada integração precisa de credenciais específicas (API keys). Consulte o administrador para obter os dados." },
      ],
    },
    {
      id: "portal",
      icon: Globe,
      color: "bg-teal-100 text-teal-600",
      title: "Portal do Cliente",
      description: "Acesso somente leitura para seus clientes",
      steps: [
        "O Portal é uma área separada onde seus clientes podem visualizar seus próprios dados.",
        "Para convidar um cliente, vá à página de detalhe do cliente e clique em 'Convidar para Portal'.",
        "Defina um email e senha temporária para o cliente.",
        "O cliente acessa o portal pelo link /portal/login com as credenciais fornecidas.",
        "No portal, o cliente vê: visão geral, seus permits, caminhões e documentos — tudo somente leitura.",
      ],
      tips: [
        { text: "O portal aumenta a transparência com seus clientes e reduz a necessidade de relatórios manuais." },
        { text: "Clientes do portal não podem editar nenhum dado — apenas visualizar.", variant: "warning" },
      ],
    },
    {
      id: "admin",
      icon: ShieldCheck,
      color: "bg-red-100 text-red-600",
      title: "Administração",
      description: "Gerenciamento de usuários, permissões e auditoria (somente admin)",
      steps: [
        "Acesse 'Usuários' na barra lateral (visível apenas para administradores).",
        "Veja todas as solicitações de acesso pendentes. Aprove ou rejeite cada uma.",
        "Altere o nível de permissão de cada usuário: Admin, Usuário, Operador ou Visualizador.",
        "Acesse 'Auditoria' para ver o histórico completo de ações do sistema: quem fez o quê e quando.",
        "Use a auditoria para rastrear alterações em clientes, permits, caminhões e mensagens.",
      ],
      tips: [
        { text: "Apenas administradores veem as opções de Usuários e Auditoria. Outros perfis não têm acesso." },
        { text: "Cuidado ao excluir usuários — a ação é irreversível!", variant: "warning" },
      ],
    },
  ];
}

// ─── EN ─────────────────────────────────────────────────────
function getEnSections(): DocSection[] {
  return [
    {
      id: "getting-started",
      icon: CheckCircle2,
      color: "bg-emerald-100 text-emerald-600",
      title: "Getting Started",
      description: "Login, signup and account approval",
      steps: [
        "Go to the Login screen and enter your registered email and password.",
        "If you don't have an account, click 'Request access' on the login screen to fill out the signup form.",
        "After signing up, check your email and click the confirmation link.",
        "After confirming, wait for admin approval. You'll see an 'Awaiting Approval' screen.",
        "Once approved by the administrator, you'll have full access to the system.",
      ],
      tips: [
        { text: "Keep your password in a safe place. If you forget it, contact the administrator." },
        { text: "While your account is not approved, you cannot access any system page.", variant: "warning" },
      ],
    },
    {
      id: "dashboard",
      icon: LayoutDashboard,
      color: "bg-blue-100 text-blue-600",
      title: "Dashboard",
      description: "Overview of metrics and system alerts",
      steps: [
        "After logging in, you'll be automatically redirected to the Dashboard.",
        "At the top, see summary cards: total clients, trucks, active permits, and expiring in 30 days.",
        "Below, the 'Expiration Summary' chart shows permit counts by time range (expired, 30d, 60d, 90d, valid).",
        "The 'Permits by Type' chart displays the distribution (IRP, IFTA, UCR, etc.).",
        "The 'Urgent Permits' section lists all permits expiring within 30 days with visual emphasis.",
        "At the bottom, see recently added clients for quick access.",
      ],
      tips: [
        { text: "Click any summary card or urgent item to navigate directly to the corresponding page." },
        { text: "Permits with less than 7 days to expire appear in red. Stay alert!", variant: "warning" },
      ],
    },
    {
      id: "clients",
      icon: Users,
      color: "bg-violet-100 text-violet-600",
      title: "Clients",
      description: "Registration, search, import and carrier management",
      steps: [
        "Click 'Clients' in the sidebar to see the full client list.",
        "Use the search bar to filter by name, DOT, MC or EIN.",
        "To add a new client, click 'New Client' in the top right corner.",
        "For a complete registration with trucks and permits, use the 'Onboarding' button — a step-by-step wizard.",
        "Click any client in the list to access the detail page with all info, trucks, and linked permits.",
        "On the detail page, you can edit data, add trucks/permits, view activity history, and invite the client to the Portal.",
        "To import multiple clients at once, use the 'Import' button and upload an Excel or CSV spreadsheet.",
      ],
      tips: [
        { text: "Onboarding is ideal for new clients — it guides you through all steps: data, services, trucks and permits." },
        { text: "When importing, make sure the 'Company Name' column is correctly mapped. It's the only required field.", variant: "warning" },
      ],
    },
    {
      id: "trucks",
      icon: Truck,
      color: "bg-orange-100 text-orange-600",
      title: "Trucks",
      description: "Fleet management for each client",
      steps: [
        "Go to 'Trucks' in the sidebar to see all registered trucks.",
        "Use search to filter by plate, VIN or make.",
        "Click 'New Truck' to add a vehicle. Select the owning client and fill in plate, make, model and year.",
        "To edit, click the edit icon on the truck's row.",
        "To remove, click the trash icon — this action is irreversible.",
      ],
      tips: [
        { text: "Each truck is linked to a client. You can also add trucks directly from the client detail page." },
      ],
    },
    {
      id: "permits",
      icon: FileCheck,
      color: "bg-emerald-100 text-emerald-600",
      title: "Permits",
      description: "Registration, expiration control and status",
      steps: [
        "Go to 'Permits' in the sidebar to see all system permits.",
        "Use the tabs 'All', 'Active', 'Expired' and 'Pending' to filter by status.",
        "Click 'New Permit' to register. Select client, type (IRP, IFTA, UCR, etc.), state, expiration date and attach the document if available.",
        "The system automatically calculates status based on expiration date: Active (green), Pending (yellow) or Expired (red).",
        "To edit or remove, use the action icons on each row.",
        "Track expirations via the Dashboard and Calendar to never miss a renewal.",
      ],
      tips: [
        { text: "Permits expire automatically by date. Always keep the expiration date updated." },
        { text: "You can attach the permit PDF/image document for quick reference." },
      ],
    },
    {
      id: "messages",
      icon: MessageSquare,
      color: "bg-cyan-100 text-cyan-600",
      title: "Messages",
      description: "Templates, scheduling and send automations",
      steps: [
        "Go to 'Messages' in the sidebar.",
        "In the 'Scheduled' tab, see all messages programmed for future delivery. Click 'New Message' to schedule one.",
        "In the 'Sent' tab, check the history of sent messages with date and channel.",
        "In the 'Automations' tab, create automatic rules: e.g. 'Send email 30 days before permit expiration'. The system monitors and sends automatically.",
        "In the 'Templates' tab, create reusable message models with placeholders like {company}, {expiration}, etc.",
        "When scheduling a message, you can choose between sending immediately or scheduling for a future date.",
      ],
      tips: [
        { text: "Automations save time — set up once and the system handles expiration alerts for you." },
        { text: "Templates with placeholders are automatically filled with client data at send time." },
      ],
    },
    {
      id: "calendar",
      icon: CalendarDays,
      color: "bg-pink-100 text-pink-600",
      title: "Calendar",
      description: "Date-based view of expirations and events",
      steps: [
        "Go to 'Calendar' in the sidebar.",
        "The calendar displays dates with permit expirations marked with colored indicators.",
        "Click any date to see which permits expire that day.",
        "On the side, see the list of upcoming expirations within 30 days with quick access to client and permit.",
        "Permits are color-coded: red (expired/urgent), yellow (31-90 days), green (90+ days).",
      ],
      tips: [
        { text: "Use the calendar as your daily tool to plan renewals and avoid delays." },
      ],
    },
    {
      id: "reports",
      icon: BarChart3,
      color: "bg-indigo-100 text-indigo-600",
      title: "Reports",
      description: "Data export as CSV and PDF",
      steps: [
        "Go to 'Reports' in the sidebar.",
        "Choose the report type: by Status, by Permit Type or by Client.",
        "Use filters (date range, type, state, client) to refine the data.",
        "Click 'Export CSV' to download a spreadsheet or 'Export PDF' to generate a formatted document.",
        "Reports include all filtered permits with complete details.",
      ],
      tips: [
        { text: "CSV reports are ideal for importing into Excel. PDF is better for sharing with clients or partners." },
        { text: "You can also generate a smart AI report by clicking the 'AI Report' button on the Dashboard." },
      ],
    },
    {
      id: "kanban",
      icon: ClipboardList,
      color: "bg-amber-100 text-amber-600",
      title: "Tasks (Kanban)",
      description: "Internal task board with priorities",
      steps: [
        "Go to 'Tasks' in the sidebar to see the Kanban board.",
        "Tasks are organized in columns: To Do, In Progress, and Done.",
        "Click 'New Task' to create one. Fill in title, description, priority and link to a client if applicable.",
        "Drag tasks between columns to update status or click to edit.",
        "Use tags and priorities to organize and filter team tasks.",
      ],
      tips: [
        { text: "Link tasks to clients to keep context. E.g.: 'Renew IFTA - TransLog Inc'." },
      ],
    },
    {
      id: "finance",
      icon: DollarSign,
      color: "bg-green-100 text-green-600",
      title: "Finance",
      description: "Invoices, billing and financial control",
      steps: [
        "Go to 'Finance' in the sidebar.",
        "At the top, see summary cards: Total Receivable, Total Received, Total Overdue.",
        "Below, charts show monthly revenue and status distribution.",
        "Click 'New Invoice' to create one. Select client, amount, description and due date.",
        "Update invoice status: Pending → Paid (with payment date) or Overdue.",
        "Use filters to search invoices by client, status or period.",
      ],
      tips: [
        { text: "Overdue invoices are highlighted. Check regularly to maintain financial health." },
      ],
    },
    {
      id: "settings",
      icon: Settings,
      color: "bg-slate-100 text-slate-600",
      title: "Settings",
      description: "WhatsApp, SMS, Email and Calendar integrations",
      steps: [
        "Go to 'Settings' in the sidebar.",
        "Configure WhatsApp API integration to send messages directly from the system.",
        "Configure the SMS provider for text message alerts.",
        "Configure the Email provider for automatic and scheduled sends.",
        "Connect Google Calendar to sync expirations automatically.",
      ],
      tips: [
        { text: "Each integration requires specific credentials (API keys). Check with the administrator for the details." },
      ],
    },
    {
      id: "portal",
      icon: Globe,
      color: "bg-teal-100 text-teal-600",
      title: "Client Portal",
      description: "Read-only access for your clients",
      steps: [
        "The Portal is a separate area where your clients can view their own data.",
        "To invite a client, go to the client detail page and click 'Invite to Portal'.",
        "Set a temporary email and password for the client.",
        "The client accesses the portal via /portal/login with the provided credentials.",
        "In the portal, the client sees: overview, their permits, trucks and documents — all read-only.",
      ],
      tips: [
        { text: "The portal increases transparency with your clients and reduces the need for manual reports." },
        { text: "Portal clients cannot edit any data — only view.", variant: "warning" },
      ],
    },
    {
      id: "admin",
      icon: ShieldCheck,
      color: "bg-red-100 text-red-600",
      title: "Administration",
      description: "User management, permissions and audit (admin only)",
      steps: [
        "Go to 'Users' in the sidebar (visible only to administrators).",
        "See all pending access requests. Approve or reject each one.",
        "Change each user's permission level: Admin, User, Operator or Viewer.",
        "Go to 'Audit' to see the complete history of system actions: who did what and when.",
        "Use the audit to track changes in clients, permits, trucks and messages.",
      ],
      tips: [
        { text: "Only administrators see the Users and Audit options. Other roles don't have access." },
        { text: "Be careful when deleting users — the action is irreversible!", variant: "warning" },
      ],
    },
  ];
}

// ─── ES ─────────────────────────────────────────────────────
function getEsSections(): DocSection[] {
  return [
    {
      id: "getting-started",
      icon: CheckCircle2,
      color: "bg-emerald-100 text-emerald-600",
      title: "Primeros Pasos",
      description: "Login, registro y aprobación de cuenta",
      steps: [
        "Acceda a la pantalla de Login ingresando su correo y contraseña registrados.",
        "Si aún no tiene cuenta, haga clic en 'Solicitar acceso' en la pantalla de login para completar el formulario de registro.",
        "Después de registrarse, revise su correo y haga clic en el enlace de confirmación.",
        "Después de confirmar, espere la aprobación del administrador. Verá una pantalla de 'Esperando Aprobación'.",
        "Cuando el administrador apruebe, tendrá acceso completo al sistema.",
      ],
      tips: [
        { text: "Guarde su contraseña en un lugar seguro. Si la olvida, contacte al administrador." },
        { text: "Mientras su cuenta no sea aprobada, no podrá acceder a ninguna página del sistema.", variant: "warning" },
      ],
    },
    {
      id: "dashboard",
      icon: LayoutDashboard,
      color: "bg-blue-100 text-blue-600",
      title: "Panel",
      description: "Visión general de métricas y alertas del sistema",
      steps: [
        "Al iniciar sesión, será redirigido automáticamente al Panel.",
        "En la parte superior, vea las tarjetas de resumen: total de clientes, camiones, permisos activos y por vencer en 30 días.",
        "Abajo, el gráfico de 'Resumen de Vencimientos' muestra la cantidad de permisos por rango de tiempo.",
        "El gráfico 'Permisos por Tipo' muestra la distribución (IRP, IFTA, UCR, etc.).",
        "La sección 'Permisos Urgentes' lista todos los permisos que vencen en los próximos 30 días.",
        "Al final, vea los últimos clientes registrados para acceso rápido.",
      ],
      tips: [
        { text: "Haga clic en cualquier tarjeta o elemento urgente para navegar directamente a la página correspondiente." },
        { text: "Los permisos con menos de 7 días para vencer aparecen en rojo. ¡Esté atento!", variant: "warning" },
      ],
    },
    {
      id: "clients",
      icon: Users,
      color: "bg-violet-100 text-violet-600",
      title: "Clientes",
      description: "Registro, búsqueda, importación y gestión de transportistas",
      steps: [
        "Haga clic en 'Clientes' en la barra lateral para ver el listado completo.",
        "Use la barra de búsqueda para filtrar por nombre, DOT, MC o EIN.",
        "Para registrar un nuevo cliente, haga clic en 'Nuevo Cliente' en la esquina superior derecha.",
        "Para el registro completo con camiones y permisos, use el botón de 'Onboarding' — un asistente paso a paso.",
        "Haga clic en cualquier cliente para acceder a la página de detalle con toda la información.",
        "En la página de detalle, puede editar datos, agregar camiones/permisos, ver el historial e invitar al cliente al Portal.",
        "Para importar varios clientes a la vez, use el botón 'Importar' y suba una hoja de cálculo.",
      ],
      tips: [
        { text: "El onboarding es ideal para nuevos clientes — lo guía por todas las etapas." },
        { text: "En la importación, verifique que la columna 'Nombre de la Empresa' esté correctamente mapeada.", variant: "warning" },
      ],
    },
    {
      id: "trucks",
      icon: Truck,
      color: "bg-orange-100 text-orange-600",
      title: "Camiones",
      description: "Gestión de la flota de cada cliente",
      steps: [
        "Acceda a 'Camiones' en la barra lateral para ver todos los camiones registrados.",
        "Use la búsqueda para filtrar por placa, VIN o marca.",
        "Haga clic en 'Nuevo Camión' para agregar un vehículo.",
        "Para editar, haga clic en el ícono de edición en la fila del camión.",
        "Para eliminar, haga clic en el ícono de papelera — esta acción es irreversible.",
      ],
      tips: [
        { text: "Cada camión está vinculado a un cliente. También puede agregar camiones desde la página de detalle del cliente." },
      ],
    },
    {
      id: "permits",
      icon: FileCheck,
      color: "bg-emerald-100 text-emerald-600",
      title: "Permisos",
      description: "Registro, control de vencimientos y estado",
      steps: [
        "Acceda a 'Permisos' en la barra lateral.",
        "Use las pestañas 'Todos', 'Activos', 'Vencidos' y 'Pendientes' para filtrar.",
        "Haga clic en 'Nuevo Permiso' para registrar. Seleccione cliente, tipo, estado, fecha de vencimiento y adjunte el documento.",
        "El sistema calcula automáticamente el estado según la fecha de vencimiento.",
        "Para editar o eliminar, use los íconos de acción en cada fila.",
        "Acompañe los vencimientos por el Panel y el Calendario.",
      ],
      tips: [
        { text: "Los permisos vencen automáticamente por fecha. Mantenga siempre la fecha actualizada." },
        { text: "Puede adjuntar el documento PDF/imagen del permiso para referencia rápida." },
      ],
    },
    {
      id: "messages",
      icon: MessageSquare,
      color: "bg-cyan-100 text-cyan-600",
      title: "Mensajes",
      description: "Templates, programación y automatizaciones de envío",
      steps: [
        "Acceda a 'Mensajes' en la barra lateral.",
        "En la pestaña 'Programados', vea los mensajes programados. Haga clic en 'Nuevo Mensaje' para programar uno.",
        "En la pestaña 'Enviados', consulte el historial de mensajes enviados.",
        "En la pestaña 'Automatizaciones', cree reglas automáticas de alerta de vencimiento.",
        "En la pestaña 'Templates', cree modelos reutilizables con placeholders.",
        "Al programar, puede elegir entre enviar inmediatamente o programar para una fecha futura.",
      ],
      tips: [
        { text: "Las automatizaciones ahorran tiempo — configúrelas una vez y el sistema se encarga de los alertas." },
        { text: "Los templates con placeholders se llenan automáticamente con los datos del cliente al enviar." },
      ],
    },
    {
      id: "calendar",
      icon: CalendarDays,
      color: "bg-pink-100 text-pink-600",
      title: "Calendario",
      description: "Vista de vencimientos y eventos por fecha",
      steps: [
        "Acceda a 'Calendario' en la barra lateral.",
        "El calendario muestra fechas con vencimientos de permisos marcados con indicadores de colores.",
        "Haga clic en cualquier fecha para ver qué permisos vencen ese día.",
        "En el lateral, vea la lista de próximos vencimientos en 30 días.",
        "Los permisos se clasifican por colores: rojo (vencido/urgente), amarillo (31-90 días), verde (más de 90 días).",
      ],
      tips: [
        { text: "Use el calendario como su herramienta diaria para planificar renovaciones." },
      ],
    },
    {
      id: "reports",
      icon: BarChart3,
      color: "bg-indigo-100 text-indigo-600",
      title: "Reportes",
      description: "Exportación de datos en CSV y PDF",
      steps: [
        "Acceda a 'Reportes' en la barra lateral.",
        "Elija el tipo de reporte: por Estado, por Tipo o por Cliente.",
        "Use los filtros para refinar los datos.",
        "Haga clic en 'Exportar CSV' o 'Exportar PDF' para descargar.",
        "Los reportes incluyen todos los permisos filtrados con detalles completos.",
      ],
      tips: [
        { text: "CSV es ideal para Excel. PDF es mejor para compartir con clientes." },
        { text: "También puede generar un reporte inteligente por IA desde el Panel." },
      ],
    },
    {
      id: "kanban",
      icon: ClipboardList,
      color: "bg-amber-100 text-amber-600",
      title: "Tareas (Kanban)",
      description: "Tablero de tareas internas con prioridades",
      steps: [
        "Acceda a 'Tareas' en la barra lateral para ver el tablero Kanban.",
        "Las tareas se organizan en columnas: Por Hacer, En Progreso y Completado.",
        "Haga clic en 'Nueva Tarea' para crear una.",
        "Arrastre las tareas entre columnas para actualizar el estado.",
        "Use etiquetas y prioridades para organizar las tareas del equipo.",
      ],
      tips: [
        { text: "Vincule tareas a clientes para mantener el contexto." },
      ],
    },
    {
      id: "finance",
      icon: DollarSign,
      color: "bg-green-100 text-green-600",
      title: "Finanzas",
      description: "Facturas, cobros y control financiero",
      steps: [
        "Acceda a 'Finanzas' en la barra lateral.",
        "En la parte superior, vea las tarjetas de resumen financiero.",
        "Los gráficos muestran ingresos mensuales y distribución por estado.",
        "Haga clic en 'Nueva Factura' para crear una.",
        "Actualice el estado de la factura: Pendiente → Pagado o Atrasado.",
        "Use los filtros para buscar facturas por cliente, estado o período.",
      ],
      tips: [
        { text: "Las facturas atrasadas aparecen destacadas. Revíselas regularmente." },
      ],
    },
    {
      id: "settings",
      icon: Settings,
      color: "bg-slate-100 text-slate-600",
      title: "Configuración",
      description: "Integraciones con WhatsApp, SMS, Email y Calendar",
      steps: [
        "Acceda a 'Configuración' en la barra lateral.",
        "Configure la integración con WhatsApp API.",
        "Configure el proveedor de SMS.",
        "Configure el proveedor de Email.",
        "Conecte Google Calendar para sincronizar vencimientos automáticamente.",
      ],
      tips: [
        { text: "Cada integración requiere credenciales específicas. Consulte al administrador." },
      ],
    },
    {
      id: "portal",
      icon: Globe,
      color: "bg-teal-100 text-teal-600",
      title: "Portal del Cliente",
      description: "Acceso de solo lectura para sus clientes",
      steps: [
        "El Portal es un área separada donde sus clientes pueden ver sus propios datos.",
        "Para invitar a un cliente, vaya a la página de detalle y haga clic en 'Invitar al Portal'.",
        "Defina un correo y contraseña temporal para el cliente.",
        "El cliente accede al portal por /portal/login con las credenciales proporcionadas.",
        "En el portal, el cliente ve: resumen, sus permisos, camiones y documentos — todo de solo lectura.",
      ],
      tips: [
        { text: "El portal aumenta la transparencia y reduce la necesidad de reportes manuales." },
        { text: "Los clientes del portal no pueden editar ningún dato — solo visualizar.", variant: "warning" },
      ],
    },
    {
      id: "admin",
      icon: ShieldCheck,
      color: "bg-red-100 text-red-600",
      title: "Administración",
      description: "Gestión de usuarios, permisos y auditoría (solo admin)",
      steps: [
        "Acceda a 'Usuarios' en la barra lateral (visible solo para administradores).",
        "Vea todas las solicitudes de acceso pendientes. Apruebe o rechace cada una.",
        "Cambie el nivel de permiso de cada usuario: Admin, Usuario, Operador o Visualizador.",
        "Acceda a 'Auditoría' para ver el historial completo de acciones del sistema.",
        "Use la auditoría para rastrear cambios en clientes, permisos, camiones y mensajes.",
      ],
      tips: [
        { text: "Solo los administradores ven las opciones de Usuarios y Auditoría." },
        { text: "¡Cuidado al eliminar usuarios — la acción es irreversible!", variant: "warning" },
      ],
    },
  ];
}
