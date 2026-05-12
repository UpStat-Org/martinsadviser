# MartinsAdviser

MartinsAdviser é um sistema web para operação e gestão de transportadoras, com foco em controle de caminhões, permits, clientes, mensagens, financeiro, auditoria e acompanhamento do trabalho interno.  
O projeto também inclui um portal do cliente, uma página de apresentação do sistema e recursos de apoio com automação e análise com IA.

## O que o sistema faz

O sistema centraliza a operação em um único lugar para reduzir trabalho manual, dar visibilidade ao time e diminuir risco de perda de prazo.  
Ele ajuda a organizar:

- cadastro e acompanhamento de clientes
- caminhões e dados da frota
- permits e vencimentos
- mensagens e comunicações
- calendário e tarefas
- financeiro e relatórios
- auditoria e documentação
- portal de consulta para clientes
- análise e apoio com IA

## Principais módulos

- `Dashboard` com visão geral da operação
- `Clientes` com cadastro, detalhe e onboarding
- `Caminhões` com controle de frota
- `Permits` com acompanhamento de status e vencimentos
- `Mensagens` para comunicação operacional
- `Calendário` para rotina e planejamento
- `Tarefas` em formato Kanban
- `Financeiro` para controle financeiro
- `Relatórios` para visão consolidada
- `Auditoria` para rastreabilidade
- `Documentação` para materiais e registros
- `Minha Mesa` e `Carga de Trabalho` para gestão interna
- `Administração de usuários` e `Configurações`
- `Portal do cliente` com acesso restrito e leitura de informações
- `Apresentação do sistema` com explicação visual e comparativa

## Diferenciais

- interface em português, inglês e espanhol
- apoio com IA para análise e tomada de decisão
- automações e alertas para reduzir trabalho repetitivo
- portal dedicado para o cliente acompanhar informações importantes
- histórico, auditoria e rastreabilidade
- organização por módulos, com navegação clara e foco operacional

## Tecnologias

O projeto é desenvolvido com:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Radix UI
- React Router
- TanStack Query
- Supabase
- React Hook Form
- Zod
- Lucide React
- Recharts

## Internacionalização

O sistema suporta:

- Português
- English
- Español

As traduções ficam centralizadas no arquivo de i18n do projeto.

## Requisitos

- Node.js 18+
- npm

## Como rodar localmente

```bash
npm install
npm run dev
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Scripts

- `npm run dev` inicia o ambiente de desenvolvimento
- `npm run build` gera a build de produção
- `npm run preview` visualiza a build gerada
- `npm run lint` executa a checagem de código
- `npm run test` executa os testes
- `npm run test:watch` executa os testes em modo observação

## Estrutura geral

- `src/pages` contém as telas principais
- `src/components` contém os componentes reutilizáveis
- `src/hooks` concentra a lógica de consulta e estado
- `src/contexts` centraliza providers globais
- `src/integrations/supabase` concentra a integração com o backend
- `src/lib` reúne utilitários e traduções

## Observação

O projeto usa Supabase como backend de autenticação e dados, com persistência de sessão no navegador.
