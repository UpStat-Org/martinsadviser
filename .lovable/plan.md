

# Plano de Implementacao — 4 Features

## 1. Dashboard Financeiro
Nova pagina `/finance` com controle de cobranças por cliente.

**Banco de dados:** Nova tabela `invoices` com campos: `id`, `user_id`, `client_id`, `amount`, `status` (pending/paid/overdue/cancelled), `due_date`, `paid_date`, `description`, `created_at`, `updated_at`. RLS por user autenticado.

**Frontend:**
- Nova pagina `src/pages/FinancePage.tsx` com: cards de resumo (total a receber, recebido, atrasado), tabela de faturas com filtros por cliente/status/data, dialog para criar/editar fatura
- Hook `src/hooks/useInvoices.ts` com CRUD completo
- Graficos: receita mensal (BarChart) e distribuicao por status (PieChart)
- Nav sidebar: icone `DollarSign`, rota `/finance`

## 2. Relatorios com IA
Edge function que usa Lovable AI (gemini-2.5-flash) para gerar resumos automaticos.

**Backend:** Edge function `ai-report` que recebe client_id, busca dados do cliente (permits, trucks, tasks) e gera um resumo com IA indicando riscos, proximas acoes e status geral.

**Frontend:** Botao "Gerar Relatorio IA" na pagina de detalhe do cliente (`ClientDetail.tsx`) e na pagina de Reports. Exibe o resumo em um dialog/card formatado.

## 3. Multi-tenancy (Roles)
Expandir o sistema de roles existente para 3 niveis: Admin, Operador, Visualizador.

**Banco de dados:** Alterar enum `app_role` para adicionar `operator` e `viewer`. Atualizar funcao `has_role`.

**Frontend:**
- Na pagina AdminUsers, adicionar dropdown para atribuir role ao usuario (admin/operator/viewer)
- `ProtectedRoute` ja existe; adicionar logica de permissoes:
  - **Admin**: acesso total + gerenciar usuarios
  - **Operador**: CRUD em clients/trucks/permits/tasks, sem admin
  - **Visualizador**: somente leitura
- Hook `useAuth` ja busca roles; expandir para retornar role atual
- Componentes condicionais (esconder botoes de edicao para viewer)

## 4. Importacao em Massa de Clientes via Excel
Upload de arquivo .xlsx/.csv na pagina de Clientes com mapeamento inteligente de colunas.

**Frontend:** `src/components/ClientImportDialog.tsx`
- Upload de arquivo (aceita .xlsx, .xls, .csv)
- Usa biblioteca `xlsx` (SheetJS) para parsear no client-side
- Deteccao automatica de colunas por nome em PT/EN/ES:
  - Nome: `name`, `nome`, `nombre`, `company`, `empresa`, `company_name`, `razao social`
  - Telefone: `phone`, `telefone`, `tel`, `teléfono`, `celular`
  - Email: `email`, `e-mail`, `correo`
  - Tambem detecta: `address`/`endereco`/`direccion`, `dot`, `mc`, `ein`
- Preview da tabela com mapeamento de colunas (usuario pode ajustar)
- Validacao: requer pelo menos nome, telefone e email mapeados
- Botao "Importar X clientes" que insere em batch via `useCreateClient`
- Feedback de progresso e erros por linha

**Dependencia nova:** `xlsx` (SheetJS)

---

## Resumo tecnico de alteracoes

| Acao | Arquivos |
|------|----------|
| Migration SQL | `invoices` table, alter `app_role` enum |
| Novas paginas | `FinancePage.tsx` |
| Novos componentes | `ClientImportDialog.tsx` |
| Novos hooks | `useInvoices.ts` |
| Edge function | `ai-report/index.ts` |
| Edicoes | `AppSidebar`, `App.tsx` (rotas), `AdminUsers`, `useAuth`, `ProtectedRoute`, `Clients.tsx`, `ClientDetail.tsx`, `translations.ts` |
| Dependencia | `xlsx` |

