# Multi-Tenancy Migration Plan

**Iniciado:** 2026-05-19
**Status atual:** Mês 2 em andamento (2026-05-20). Feature flags por org concluídas; restam branding, refactor isAdmin, subdomínio.

## Contexto e visão

O MartinsAdviser foi originalmente construído como single-tenant pra uma cliente específica (consultoria de permits/trucking nos EUA). A cliente não tá usando o produto, mas o sistema tá completo e tem potencial comercial. **A decisão foi transformá-lo em um SaaS vertical white-label pra empresas de permit services / trucking nos EUA**, com a MartinsAdviser virando o "cliente 0" e novos clientes onboardando como organizations isoladas.

**Não é um CRM genérico** — é vertical (mantém FMCSA, permits, trucks, workload, kanban de permits). O diferencial está justamente em ser focado no nicho. Cliente cresceria entre 300-2k/mês por org.

### Decisões de produto

| Item             | Decisão                                                  | Justificativa                                    |
| ---------------- | -------------------------------------------------------- | ------------------------------------------------ |
| ICP              | Vertical (permits/trucking) + flags pra desligar módulos | Mantém valor do domínio + flexibilidade          |
| Horizonte        | Produto sério em 3-4 meses                               | Onboarding 2º cliente como meta                  |
| Go-to-market     | Sales-led nos primeiros 5-10 clientes, self-serve depois | ICP pequeno e identificável, onboarding complexo |
| Pricing (futuro) | Por seat + tier por volume (permits/trucks ativos)       | Padrão pra vertical SaaS B2B                     |

## Arquitetura multi-tenant

**Padrão escolhido:** `org_id` em toda tabela de dados + RLS no Supabase pra isolar por membership.

**Alternativas descartadas:** schema por tenant (operacionalmente caro), DB por tenant (overkill pra esse estágio).

**Risco principal:** uma RLS mal configurada vaza dados entre clientes. Mitigado por testes de isolamento (Week 4).

### Tabelas de tenancy (novas)

- `organizations` — `id`, `slug`, `name`, `branding jsonb`, `feature_flags jsonb`, `subscription_status`
- `organization_members` — `(organization_id, user_id)` PK, `role` (owner/admin/member), `approval_status`
- `organization_invitations` — convites por email com token

### Helpers SECURITY DEFINER

- `current_org_id()` — lê `org_id` do JWT claim (preferido) ou cai pro primeiro membership aprovado (fallback)
- `is_org_member(org_id)`
- `has_org_role(org_id, role)`
- `is_org_admin(org_id)` — true pra owner OU admin

### Padrão de policies por tabela

```sql
-- Read: org member
CREATE POLICY "..." ON public.X FOR SELECT TO authenticated USING (is_org_member(org_id));
-- Insert: org member + user_id check
CREATE POLICY "..." ON public.X FOR INSERT TO authenticated WITH CHECK (is_org_member(org_id) AND auth.uid() = user_id);
-- Update/Delete: variantes
```

## Roadmap 3-4 meses

| Fase                                    | Escopo                                                    | Status                                                      |
| --------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| **Week 1** — Foundation                 | Tabelas de tenancy + helpers + seed MartinsAdviser        | ✅ Done                                                     |
| **Week 2** — org_id rollout             | 19 tabelas com `org_id` + policies reescritas             | ✅ Done                                                     |
| **Week 3** — Frontend                   | OrgContext, JWT hook (deferred), signup trigger           | ✅ Done                                                     |
| **Week 4** — Hardening                  | Edge functions restantes + testes isolamento cross-tenant | ✅ Done (38/38 asserções de isolamento passaram em 2026-05-20)        |
| **Mês 2** — Modularização + white-label | Feature flags por org, branding por org, subdomínio       | 🟡 Em andamento (flags ✅, branding ✅ 2026-05-20; subdomínio ⬜)|
| **Mês 3** — Onboarding + billing        | Stripe, signup self-serve org, super-admin panel          | ⬜ Futuro                                                   |
| **Mês 4** — Polimento + launch          | Landing page, docs, testes de carga                       | ⬜ Futuro                                                   |

## Histórico de execução (Weeks 1-3)

### Migrations aplicadas

| Arquivo                                             | Conteúdo                                                                                                  | Aplicado?                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `20260519175109_multitenancy_foundation.sql`        | Organizations, members, invitations, helpers, seed MartinsAdviser                                         | ✅                                         |
| `20260519180000_clients_multitenancy.sql`           | org_id em `clients`                                                                                       | ✅                                         |
| `20260519181000_trucks_permits_multitenancy.sql`    | org_id em `trucks`, `permits`, `permit_history`, `permit_documents`                                       | ✅                                         |
| `20260519182000_tasks_invoices_multitenancy.sql`    | org_id em `tasks`, `invoices`                                                                             | ✅                                         |
| `20260519183000_portal_signatures_multitenancy.sql` | org_id em `client_portal_users`, `document_signatures`                                                    | ✅                                         |
| `20260519184000_system_tables_multitenancy.sql`     | org_id em `notifications`, `activity_log`, `automation_rules`, `automation_log`                           | ✅                                         |
| `20260519185000_aux_tables_multitenancy.sql`        | org_id em `comments`, `saved_filters`, `message_templates`, `scheduled_messages`, `client_internal_notes` | ✅                                         |
| `20260519186000_ai_chat_multitenancy.sql`           | org_id em `ai_chat_messages`                                                                              | ✅                                         |
| `20260519190000_jwt_org_claim_hook.sql`             | `custom_access_token_hook`, `profiles.active_org_id`                                                      | ✅ (função dormante — hook não registrado) |
| `20260519191000_signup_membership.sql`              | Trigger `handle_new_user` cria membership                                                                 | ✅                                         |

**Total: 19 tabelas com `org_id NOT NULL` + RLS org-scoped.**

### Tabelas intencionalmente NÃO migradas (e por quê)

- `profiles` — perfil é global (auth.users)
- `user_roles` — legacy global; sucesso pelo `organization_members.role`. Migrar callers de `has_role()` pra `has_org_role()` é trabalho de Phase 2
- `google_calendar_tokens` — credencial OAuth pessoal do usuário, não dado da org. Per-user RLS já isola. Revisitar quando multi-org user surgir
- `organizations`, `organization_members`, `organization_invitations` — as próprias tabelas de tenancy

### Edge functions patchadas (e deployadas via `supabase functions deploy`)

| Function                   | Patch                                                                        | Status                                                                 |
| -------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `generate-notifications`   | Passa `org_id` em 3 INSERTs (permits/invoices/tasks → notifications)         | ✅ deployed                                                            |
| `check-permit-expirations` | Passa `org_id` em INSERTs de `tasks`, `automation_log`, `scheduled_messages` | ✅ deployed (2x — 1ª round + 1 patch posterior pro scheduled_messages) |
| `ai-chat`                  | Passa `org_id` (de `client.org_id`) em INSERTs de `ai_chat_messages`         | ✅ deployed                                                            |

### Frontend (editado mas ainda não deployado pro Netlify)

| Arquivo                          | Mudança                                                   |
| -------------------------------- | --------------------------------------------------------- |
| `src/contexts/OrgContext.tsx`    | NOVO — provider + `useOrg()`                              |
| `src/components/OrgSwitcher.tsx` | NOVO — dropdown (só renderiza se >1 org)                  |
| `src/App.tsx`                    | `<OrgProvider>` wrapping                                  |
| `src/components/AppSidebar.tsx`  | Mounta `<OrgSwitcher />` (invisível em single-org)        |
| `src/pages/AdminUsers.tsx`       | `updateStatus` espelha approval em `organization_members` |

### Constraints operacionais conhecidas

- **Sem acesso ao Supabase Dashboard** — só Lovable. Implica:
  - JWT Custom Access Token Hook NÃO foi registrado. Fallback de `current_org_id()` cobre single-org.
  - Pra Phase 2 (onboarding 2º cliente), vai precisar destravar acesso (provavelmente via Lovable abrindo no Supabase, ou conta nova no supabase.com).
- **Supabase CLI instalada** localmente. Login + link feitos. Deploys de functions funcionam.
- **Lovable é o canal pra rodar SQL** (Dashboard → SQL Editor). Cron funciona normal (já rodando diariamente).

## Estado pendente da Week 3

**Pra aplicar agora:**

1. Aplicar `supabase/migrations/20260519191000_signup_membership.sql` no SQL Editor do Lovable. Verificar:

   ```sql
   SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
   -- Esperado: corpo inclui INSERT INTO organization_members
   ```

2. Testar frontend local:

   ```bash
   cd "/home/yago/Área de trabalho/martinsadviser"
   bun run dev
   ```

   - Login com conta admin → tudo deve continuar funcionando
   - Sidebar: OrgSwitcher NÃO deve aparecer (single-org)
   - Criar signup teste → profile + membership pending → aprovar via AdminUsers → login da conta teste deve passar

3. Deploy do frontend (Netlify auto-build via push pro repo).

## Week 4 — Hardening (concluído 2026-05-20)

### Edge functions auditadas/patchadas

| Function                  | Patch                                                                                               | Status     |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ---------- |
| `ai-report`               | Adicionou auth check (`getClaims`) + valida `is_org_member(client.org_id)` antes de gerar relatório | ✅ deployed |
| `delete-user`             | Substituiu `has_role` global por checagem de admin/owner na `active_org_id`. Limpa membership.       | ✅ deployed |
| `create-portal-user`      | Substituiu `has_role` global, busca `clients.org_id`, valida caller, passa `org_id` explícito       | ✅ deployed |
| `google-calendar-sync`    | Filtra permits por `profiles.active_org_id` em vez de `user_id`                                     | ✅ deployed |
| `send-emails`             | Auditado — `claim_pending_messages` é seguro (cada msg carrega `org_id` próprio)                    | ✅ no patch |
| `google-calendar-callback`/`google-calendar-auth`/`fmcsa-lookup`/`health` | Não tocam dados org-scoped — OK                                          | ✅ no patch |

### Realtime, Storage, Audit log

| Área                   | Mudança                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Realtime               | `useNotifications.ts` — channel filtrado por `org_id` (postgres_changes filter), queryKey inclui orgId                              |
| Storage policies       | 4 policies de `storage.objects` reescritas pra exigir prefix do path = `org_id` membership (migration `20260520120000`)              |
| Storage upload         | `PermitFormDialog.tsx` — uploads agora em `${orgId}/${permitId}/${ts}.${ext}`                                                       |
| Storage backfill       | Migration move arquivos legacy pro prefix `00000000-0000-0000-0000-000000000001/`, reescreve `permits.document_url` para casar      |
| Audit log triggers     | 5 trigger functions (clients/permits/trucks/invoices/tasks) reescritas pra passar `NEW.org_id` (migration `20260520115000`)         |

### Suite de testes

`supabase/tests/cross_tenant_isolation.sql` — script standalone que cria Org B + 2 users sintéticos, semeia 1 row por org em cada tabela (19), e via `SET LOCAL ROLE authenticated` + `request.jwt.claims` confirma que cada user NÃO vê rows da outra org. Roda em transação com `ROLLBACK` no final, sem persistir nada. 38 asserções (19 tabelas × 2 direções) + happy-path sanity check.

### Pendências conhecidas (follow-ups)

| Item                                                                          | Quando atacar                                                              |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Bucket `permit-documents` ainda é PUBLIC — URLs vazadas seguem baixáveis      | Mês 2 (junto com signed URLs). Exige regerar todos os `permits.document_url`. |
| JWT Custom Access Token Hook não registrado (sem Dashboard Supabase)          | Antes de onboardar 2º cliente                                              |
| `useAuth.isAdmin` ainda lê `user_roles` legacy                                | Phase 2 — migrar pra `useOrg().isOrgAdmin`                                 |

## Próximas decisões pendentes

| Quando                        | Decisão                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| Antes de onboardar 2º cliente | Conseguir acesso ao Supabase Dashboard pra registrar JWT hook                                |
| ~~Antes de Phase 2~~          | ~~Refatorar `useAuth.isAdmin` → `useOrg().isOrgAdmin`~~ ✅ Feito 2026-05-20                  |
| Antes de Phase 2              | Definir pricing (por seat? por permit? flat?)                                                |
| Mês 2                         | Quais módulos viram opt-in via `feature_flags` (AI? portal? calendar?)                       |
| Mês 2                         | Subdomínio por org (`acme.app.com`) — DNS strategy no Netlify/CDN                            |
| Mês 3                         | Stripe (planos, trial, billing portal, webhooks)                                             |
| Mês 3                         | Super-admin panel pra gerenciar orgs                                                         |

## Riscos conhecidos

| Risco                                                                         | Mitigação atual                                                            |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| RLS policy faltando `org_id` em alguma operação → vazamento cross-tenant      | Suite de testes de isolamento (Week 4 pendente)                            |
| Edge function service_role esquecendo `org_id` em INSERT                      | Auditoria Week 4; já cobertas as 3 que escrevem em tabelas com `org_id`    |
| Trigger `handle_new_user` hardcoda MartinsAdviser UUID                        | Documentado — quebra quando signup multi-tenant for implementado (Phase 2) |
| JWT hook não registrado → `current_org_id()` usa fallback frágil em multi-org | OK pra single-org; bloqueia Phase 2 até registrar                          |
| `user_roles` legacy ainda em uso (via `has_role()` no frontend)               | Funciona em single-org; migrar callers em Phase 2                          |
| Realtime / Storage policies não auditados ainda                               | Week 4                                                                     |

## Referências rápidas

- **Org default UUID:** `00000000-0000-0000-0000-000000000001` (MartinsAdviser)
- **Supabase project ref:** `zidfrlzgftaqhnvedpnm`
- **Production URL:** martinsadviser.com (Netlify)
- **Cron jobs:**
  - `check-permit-expirations-daily` — `0 9 * * *` (UTC)
  - `send-emails-every-5min` — `*/5 * * * *`
- **Migrações:** `supabase/migrations/2026051*`
- **Edge functions:** `supabase/functions/{name}/index.ts`

## Comandos úteis

```bash
# Deploy de edge function
supabase functions deploy <name>

# Logs do cron
psql ... -c "SELECT start_time, status, return_message FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;"

# Trigger manual do cron (no SQL Editor do Lovable)
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_functions_url') || '/check-permit-expirations',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
  )
);

# Inventário rápido de quem tem org_id
SELECT t.table_name, CASE WHEN c.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
  ON c.table_schema = t.table_schema AND c.table_name = t.table_name AND c.column_name = 'org_id'
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY 2, 1;
```
