

# Plano — 4 Features

## 1. Busca Global (Global Search)
Componente de busca no topo do layout que pesquisa em clientes, trucks, permits e faturas simultaneamente.

**Arquivos:**
- `src/components/GlobalSearch.tsx` — Componente com `cmdk` (Command Menu, ja instalado) ativado por `Ctrl+K` ou clique no icone de busca. Busca em tempo real nas 4 tabelas via Supabase `.ilike()`. Resultados agrupados por categoria com navegacao direta ao clicar.
- `src/components/AppLayout.tsx` — Adicionar barra de busca no topo do main content area (header com GlobalSearch + Outlet).

## 2. Audit Log
Pagina `/audit` para admins visualizarem todas as acoes do sistema.

**Banco de dados:** Ja existe a tabela `activity_log`. Expandir os triggers existentes para cobrir mais entidades (invoices, tasks). Adicionar trigger para log de client creation (hoje so loga update).

**Migration:**
- Trigger `log_client_create_activity` para INSERT em clients
- Trigger `log_invoice_activity` para INSERT/UPDATE/DELETE em invoices
- Trigger `log_task_activity` para INSERT/UPDATE/DELETE em tasks

**Frontend:**
- `src/pages/AuditPage.tsx` — Tabela com filtros por entity_type, action, data. Mostra user email (join com profiles), entidade afetada, acao, detalhes e timestamp.
- Rota `/audit` no App.tsx, link no sidebar (apenas para admins, ao lado de Users)

## 3. Assinatura Digital de Documentos
Componente para clientes assinarem documentos de autorizacao digitalmente.

**Banco de dados:** Nova tabela `document_signatures`:
- `id`, `user_id`, `client_id`, `permit_id` (nullable), `document_name`, `signer_name`, `signer_email`, `signature_data` (text, base64 da imagem), `signed_at`, `ip_address`, `created_at`

**Frontend:**
- `src/components/SignatureDialog.tsx` — Dialog com canvas para desenhar assinatura (usando API Canvas nativa, sem lib externa). Campos: nome do assinante, email, nome do documento. Botao para limpar e confirmar. Salva base64 da assinatura no banco.
- `src/components/SignatureViewer.tsx` — Exibe assinatura salva com metadados (quem assinou, quando, IP).
- Integrar na pagina de detalhe do cliente (nova tab "Assinaturas") e opcionalmente em permits individuais.

## 4. Mapa de Cobertura de Permits por Estado
Visualizacao dos estados cobertos por permits de cada cliente.

**Frontend:**
- `src/components/PermitCoverageMap.tsx` — Mapa SVG dos EUA com estados coloridos baseado na cobertura de permits. Estados com permits ativos em verde, expirando em amarelo, vencidos em vermelho, sem cobertura em cinza. Tooltip com detalhes ao hover.
- Usar SVG inline dos estados americanos (paths estaticos no componente, sem dependencia externa).
- Integrar na pagina de detalhe do cliente (acima das tabs, ao lado do ComplianceDashboard) e como card no Dashboard geral mostrando cobertura agregada.

---

## Resumo de alteracoes

| Acao | Arquivos |
|------|----------|
| Migration SQL | triggers para clients INSERT, invoices, tasks + tabela `document_signatures` |
| Novas paginas | `AuditPage.tsx` |
| Novos componentes | `GlobalSearch.tsx`, `SignatureDialog.tsx`, `SignatureViewer.tsx`, `PermitCoverageMap.tsx` |
| Edicoes | `AppLayout.tsx` (header com busca), `App.tsx` (rota /audit), `AppSidebar.tsx` (link audit), `ClientDetail.tsx` (tab assinaturas + mapa), `Dashboard.tsx` (mapa agregado), `translations.ts` |

