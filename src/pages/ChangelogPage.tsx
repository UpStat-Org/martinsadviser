import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity, Banknote, BookOpen, BriefcaseBusiness, CheckSquare,
  FileCheck2, Globe2, History, LayoutDashboard, MessageSquare,
  Package, Settings, ShieldCheck, Truck, UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Feature = { title: string; description: string };
type FeatureGroup = {
  title: string;
  description: string;
  icon: LucideIcon;
  items: Feature[];
};

// This is deliberately a product inventory rather than release notes: people
// can use it to discover everything that is available in the current app.
const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "Acesso e espaço de trabalho",
    description: "Entrar no sistema, trabalhar em equipe e deixar a conta com a sua cara.",
    icon: UsersRound,
    items: [
      { title: "Cadastro, login e recuperação de senha", description: "Crie a conta, confirme o e-mail, entre com segurança e recupere a senha quando precisar." },
      { title: "Aprovação de novos usuários", description: "Novas contas podem aguardar a liberação de um administrador antes de acessar os dados." },
      { title: "Várias organizações", description: "Troque entre empresas sem misturar clientes, documentos ou operação." },
      { title: "Marca própria", description: "Defina nome, logo, cores e domínio da organização." },
      { title: "Subdomínio da organização", description: "Cada empresa pode usar seu próprio endereço de acesso quando o domínio estiver configurado." },
      { title: "Papéis e permissões", description: "Administradores, operadores, visualizadores e clientes veem apenas o que podem usar." },
      { title: "País, moeda e unidades", description: "A conta pode trabalhar com regras, moeda, peso e distância adequados ao país." },
      { title: "Português, inglês e espanhol", description: "A interface pode ser trocada entre os três idiomas a qualquer momento." },
      { title: "Tema claro e escuro", description: "Escolha a aparência mais confortável para trabalhar." },
      { title: "Uso no celular", description: "A navegação se adapta para celular e tablet, inclusive o menu lateral." },
    ],
  },
  {
    title: "Visão geral e produtividade",
    description: "Encontre o que precisa e acompanhe o dia sem ficar pulando entre telas.",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", description: "Mostra clientes, frota, permissões, vencimentos, mensagens, receita e indicadores principais em um só lugar." },
      { title: "Indicadores e gráficos", description: "Acompanhe conformidade, vencimentos, receita mensal, permissões por tipo e mensagens." },
      { title: "Minha mesa", description: "Reúne tarefas, prazos, pendências e itens que precisam da sua atenção." },
      { title: "Briefing diário", description: "Exibe um resumo dos principais pontos da operação para começar o dia." },
      { title: "Busca global", description: "Use a busca no topo ou Ctrl/Cmd + K para encontrar clientes, caminhões, permissões e outras telas rapidamente." },
      { title: "Notificações", description: "Receba avisos de prazos, tarefas, vencimentos e acontecimentos importantes." },
      { title: "Filtros, visualizações salvas e tabelas ajustáveis", description: "Filtre listas, salve combinações frequentes e escolha as colunas que quer ver." },
      { title: "Comentários, notas e histórico", description: "Deixe observações internas e consulte o que aconteceu em cada registro." },
    ],
  },
  {
    title: "Clientes e relacionamento",
    description: "Cadastre, organize e acompanhe cada transportadora ou empresa atendida.",
    icon: UsersRound,
    items: [
      { title: "Cadastro completo de clientes", description: "Guarde dados da empresa, contatos, endereços, identificações e observações." },
      { title: "Onboarding guiado", description: "Cadastre um novo cliente por etapas, incluindo serviços, caminhões e permissões." },
      { title: "Importação de clientes", description: "Envie uma planilha Excel ou CSV para cadastrar vários clientes de uma vez." },
      { title: "Tags", description: "Crie etiquetas para segmentar e localizar clientes com mais facilidade." },
      { title: "Página detalhada do cliente", description: "Veja dados, frota, permissões, documentos, atividade e itens relacionados no mesmo lugar." },
      { title: "Risco e conformidade do cliente", description: "Acompanhe pontuação, alertas e um relatório simples de conformidade." },
      { title: "Convite para o portal", description: "Envie um acesso para o cliente acompanhar serviços, documentos, propostas e faturas." },
    ],
  },
  {
    title: "Caminhões e motoristas",
    description: "Controle da frota, documentos e pessoas que fazem a operação acontecer.",
    icon: Truck,
    items: [
      { title: "Cadastro de caminhões", description: "Registre placa, VIN, marca, modelo, ano, cliente responsável e outros dados do veículo." },
      { title: "Página do caminhão", description: "Consulte dados, permissões, documentos e atividade recente de cada veículo." },
      { title: "Manutenção", description: "Registre serviços de manutenção, custos, datas e próximas necessidades." },
      { title: "Seguros", description: "Acompanhe apólices, cobertura e vencimentos da frota." },
      { title: "Acidentes e assistência na estrada", description: "Registre ocorrências e informações de apoio para cada caminhão." },
      { title: "Cadastro de motoristas", description: "Mantenha dados pessoais, situação, documentos e motorista vinculado à operação." },
      { title: "Prontuário do motorista", description: "Acompanhe documentos, checklist de qualificação, notas e histórico do motorista." },
      { title: "ELD e horas de serviço", description: "Vincule dados do ELD, faça associação de motoristas e veja violações de horas de serviço quando o módulo estiver configurado." },
    ],
  },
  {
    title: "Permissões, documentos e vencimentos",
    description: "Tudo que precisa estar válido para a operação seguir sem surpresa.",
    icon: FileCheck2,
    items: [
      { title: "Cadastro de permissões", description: "Controle tipo, estado, cliente, caminhão, número, status e data de validade." },
      { title: "Importação de permissões", description: "Cadastre várias permissões usando planilha." },
      { title: "Documentos anexados", description: "Envie e consulte PDFs, imagens e outros comprovantes ligados à permissão." },
      { title: "Status automático", description: "O sistema destaca permissões ativas, pendentes, próximas do vencimento e vencidas." },
      { title: "Histórico de alterações", description: "Consulte renovações, mudanças e ações feitas em cada permissão." },
      { title: "Calendário de vencimentos", description: "Veja prazos de conformidade em uma visão de calendário." },
      { title: "Mapa de cobertura", description: "Visualize onde cada permissão é válida quando essa informação estiver cadastrada." },
    ],
  },
  {
    title: "Cargas e rastreamento ao vivo",
    description: "Planeje a viagem e acompanhe o motorista por um link temporário.",
    icon: Package,
    items: [
      { title: "Cadastro de cargas", description: "Registre referência, cliente, origem, destino, coleta, entrega, mercadoria, peso e valor." },
      { title: "Alocação de caminhão e motorista", description: "Vincule os responsáveis pela carga e faça ajustes durante a operação." },
      { title: "Paradas e etapas", description: "Adicione coletas e entregas extras quando a viagem tiver mais de um ponto." },
      { title: "Documentos da carga", description: "Anexe comprovantes e arquivos relacionados ao transporte." },
      { title: "Link do motorista", description: "Crie um link temporário para o motorista autorizar o GPS do celular, sem precisar criar conta." },
      { title: "Mapa ao vivo", description: "Veja a última posição, o caminho percorrido e a atualização mais recente da viagem." },
      { title: "Controle do compartilhamento", description: "O link expira sozinho e pode ser encerrado pelo operador a qualquer momento." },
    ],
  },
  {
    title: "Ordens de serviço e execução",
    description: "Transforme pedidos em trabalho organizado, com responsáveis, prazo e resultado.",
    icon: BriefcaseBusiness,
    items: [
      { title: "Catálogo de serviços", description: "Cadastre os serviços que sua empresa oferece e reutilize-os nas ordens." },
      { title: "Ordens de serviço", description: "Abra, priorize, atribua responsável, defina prazo, valor, custo e andamento." },
      { title: "Checklist e documentos", description: "Monte etapas, acompanhe o que falta, receba arquivos e aprove ou rejeite documentos." },
      { title: "Tarefas e horas na ordem", description: "Crie tarefas ligadas ao serviço e registre o tempo gasto pela equipe." },
      { title: "Custo e margem", description: "Veja custo de mão de obra, custo externo, valor cobrado e margem estimada." },
      { title: "Assinaturas", description: "Colete e consulte assinaturas de documentos e etapas da ordem." },
      { title: "Perguntas do cliente", description: "Receba solicitações pelo portal e responda dentro da própria ordem." },
      { title: "Renovações", description: "Crie uma nova ordem baseada em uma anterior, levando escopo, checklist e permissões vinculadas." },
      { title: "Linha do tempo", description: "Registra mudanças importantes de status, prazo, valores, responsáveis e documentos." },
    ],
  },
  {
    title: "Tarefas, tempo e agenda",
    description: "Organize o trabalho da equipe e não perca prazos.",
    icon: CheckSquare,
    items: [
      { title: "Quadro de tarefas", description: "Crie tarefas, mova entre etapas, defina prioridade, prazo, responsável e cliente." },
      { title: "Modelos de tarefa", description: "Crie tarefas prontas para repetir processos da equipe." },
      { title: "Registro de tempo", description: "Marque o tempo gasto em tarefas e ordens de serviço." },
      { title: "Calendário", description: "Veja tarefas, vencimentos e compromissos em uma visão por data." },
      { title: "Carga de trabalho", description: "Administradores podem acompanhar a distribuição das tarefas entre as pessoas." },
    ],
  },
  {
    title: "Mensagens, vendas e propostas",
    description: "Converse com clientes e acompanhe oportunidades comerciais.",
    icon: MessageSquare,
    items: [
      { title: "Mensagens agendadas", description: "Prepare mensagens para envio futuro e acompanhe o status delas." },
      { title: "Modelos de mensagem", description: "Padronize textos para não precisar reescrever comunicações frequentes." },
      { title: "Histórico de envios", description: "Consulte o que foi enviado, quando e por qual canal." },
      { title: "Leads", description: "Registre oportunidades, origem, responsável, etapa e próximos passos." },
      { title: "Propostas", description: "Crie orçamentos com itens, quantidades, valores, validade e status." },
      { title: "Aprovação de proposta pelo portal", description: "O cliente pode consultar e aceitar ou recusar uma proposta pelo próprio acesso." },
    ],
  },
  {
    title: "Financeiro e relatórios",
    description: "Acompanhe receita, custos, cobranças e resultados da operação.",
    icon: Banknote,
    items: [
      { title: "Faturas e receitas", description: "Registre cobranças, vencimentos, pagamento e situação financeira." },
      { title: "Despesas", description: "Cadastre gastos por categoria, cliente, data e responsável." },
      { title: "Planos recorrentes", description: "Automatize cobranças e serviços que se repetem todo mês." },
      { title: "Contas a receber", description: "Acompanhe atrasos, envelhecimento de cobrança e ações de recuperação." },
      { title: "Previsão de receita", description: "Veja uma projeção simples do que pode entrar nos próximos períodos." },
      { title: "Lucratividade por cliente", description: "Compare receita, custo e margem de cada cliente." },
      { title: "Relatórios", description: "Monte visões de operação e financeiro, com exportação para arquivo quando disponível." },
      { title: "Valor da hora", description: "Defina um custo/hora da organização para calcular melhor a margem das ordens." },
    ],
  },
  {
    title: "Conformidade nos Estados Unidos",
    description: "Recursos específicos para a operação e obrigações de transporte nos EUA.",
    icon: ShieldCheck,
    items: [
      { title: "Calendário de conformidade", description: "Acompanhe datas importantes e obrigações regulatórias." },
      { title: "Drug & Alcohol Testing", description: "Registre programas, testes, resultados e próximos requisitos." },
      { title: "HVUT", description: "Controle formulários, veículos, períodos e comprovantes de imposto de veículos pesados." },
      { title: "IFTA", description: "Registre viagens, combustível, taxas, períodos e declarações de IFTA." },
      { title: "Tabelas de taxas IFTA", description: "Administradores podem manter as taxas usadas nos cálculos." },
      { title: "IRP", description: "Acompanhe frota, jurisdições e informações de registro proporcional." },
      { title: "Consulta SAFER e MCS-150", description: "Consulte dados públicos de segurança e cadastro da transportadora." },
      { title: "CSA, New Entrant e PSP", description: "Acompanhe indicadores e pontos relevantes de segurança e qualificação." },
    ],
  },
  {
    title: "Conformidade no Brasil",
    description: "Recursos adaptados para a realidade operacional brasileira.",
    icon: Globe2,
    items: [
      { title: "Painel de conformidade brasileira", description: "Reúne obrigações, documentos e prazos relevantes para a organização no Brasil." },
      { title: "Multas", description: "Registre multas, valores, status, vencimentos e comprovantes." },
      { title: "Moeda e unidades brasileiras", description: "Permite operar com configurações de país adequadas, como real e quilômetros." },
    ],
  },
  {
    title: "Portal do cliente",
    description: "Um espaço separado para o cliente acompanhar o que é dele.",
    icon: Globe2,
    items: [
      { title: "Acesso separado do cliente", description: "O cliente entra no portal sem acessar as telas internas da equipe." },
      { title: "Painel do cliente", description: "Mostra o resumo de pedidos, propostas e faturas disponíveis." },
      { title: "Ordens de serviço no portal", description: "Permite ver etapas, checklist, documentos, prazos e histórico." },
      { title: "Envio e assinatura de documentos", description: "O cliente pode anexar arquivos, substituir documentos e assinar itens solicitados." },
      { title: "Propostas e faturas", description: "O cliente consulta, responde propostas e acompanha faturas pelo portal." },
    ],
  },
  {
    title: "Administração e controle",
    description: "Ferramentas para quem administra a organização e a plataforma.",
    icon: Settings,
    items: [
      { title: "Usuários e convites", description: "Convide pessoas, aprove acessos, altere papéis e remova usuários quando necessário." },
      { title: "Auditoria", description: "Consulte um registro das ações importantes feitas no sistema." },
      { title: "Módulos por organização", description: "Ative ou desative recursos comerciais conforme o plano da empresa." },
      { title: "Assinatura e cobrança", description: "Gerencie informações de plano, cobrança e acesso da organização." },
      { title: "Administração central", description: "Usuários superadministradores podem acompanhar e configurar várias organizações." },
      { title: "Documentação dentro do sistema", description: "Acesse guias de uso e passos básicos sem sair do produto." },
    ],
  },
  {
    title: "Assistência inteligente",
    description: "Recursos adicionais que podem estar habilitados conforme a configuração da organização.",
    icon: Activity,
    items: [
      { title: "Assistente operacional", description: "Ajuda a encontrar informações e orientar tarefas dentro da plataforma quando esse recurso estiver ativo." },
      { title: "Resumo inteligente", description: "Pode transformar dados da operação em um briefing mais direto para o dia." },
    ],
  },
];

export default function ChangelogPage() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const groups = useMemo(() => FEATURE_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !normalizedQuery || `${group.title} ${group.description} ${item.title} ${item.description}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery)),
  })).filter((group) => group.items.length > 0), [normalizedQuery]);
  const total = FEATURE_GROUPS.reduce((sum, group) => sum + group.items.length, 0);
  const displayed = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Changelog"
        meta={<span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium"><History className="h-3.5 w-3.5" />{total} recursos mapeados</span>}
        description="Tudo que já existe no sistema hoje, explicado de forma simples. Esta página é atualizada junto com o produto."
      />

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Catálogo da versão atual</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Alguns itens só aparecem para administradores, para o país configurado ou quando o módulo faz parte do plano da organização.</p>
          </div>
          <div className="w-full sm:w-72">
            <label htmlFor="changelog-search" className="sr-only">Buscar recurso</label>
            <Input id="changelog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar um recurso..." />
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">{displayed === total ? `Mostrando todos os ${total} recursos.` : `${displayed} recurso${displayed === 1 ? "" : "s"} encontrado${displayed === 1 ? "" : "s"}.`}</p>

      <div className="grid gap-4 xl:grid-cols-2">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <Card key={group.title} className="h-full">
              <CardContent className="p-5">
                <div className="mb-4 flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-4.5 w-4.5" /></div>
                  <div>
                    <h2 className="font-semibold">{group.title}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{group.description}</p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {group.items.map((item) => (
                    <li key={item.title} className="border-l-2 border-primary/20 pl-3">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!groups.length && <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum recurso encontrado para “{query}”.</CardContent></Card>}
    </div>
  );
}
