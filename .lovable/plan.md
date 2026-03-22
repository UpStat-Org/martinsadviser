

## Central de Notificações

Adicionar um sistema de notificações em tempo real no header da aplicação, com um ícone de sino que mostra alertas importantes sem sair da página atual.

### O que o usuário verá

- Um ícone de sino no header (ao lado da busca global) com um badge vermelho mostrando a contagem de notificações não lidas
- Ao clicar, abre um painel dropdown com as notificações agrupadas por categoria
- Cada notificação tem ícone, título, descrição e timestamp
- Botão "marcar todas como lidas"

### Tipos de notificações (calculadas client-side a partir dos dados existentes)

1. **Permits expirando** — permits que vencem em 30 dias ou menos (amarelo) e expirados (vermelho)
2. **Invoices atrasadas** — faturas com status "pending" e due_date no passado
3. **Tasks pendentes** — tasks com status "not_started" há mais de 7 dias

### Mudanças técnicas

1. **Nova tabela `notifications`** no banco de dados:
   - `id`, `user_id`, `type` (permit_expiring, invoice_overdue, task_stale), `title`, `body`, `entity_id`, `read` (boolean), `created_at`
   - RLS: usuários veem/atualizam apenas suas próprias notificações
   - Realtime habilitado para atualizações instantâneas

2. **Novo componente `NotificationCenter.tsx`**:
   - Ícone de sino com badge de contagem
   - Popover/dropdown com lista de notificações
   - Marca como lida ao clicar ou "marcar todas"
   - Usa realtime para atualizar sem refresh

3. **Novo hook `useNotifications.ts`**:
   - Query para buscar notificações do usuário
   - Mutation para marcar como lida
   - Subscription realtime para novas notificações

4. **Edge Function `generate-notifications`**:
   - Scheduled via pg_cron (1x por hora)
   - Verifica permits expirando, invoices atrasadas, tasks paradas
   - Insere notificações novas evitando duplicatas (checa entity_id + type)

5. **`AppLayout.tsx`**: Adicionar o `NotificationCenter` no header ao lado do `GlobalSearch`

### Arquitetura

```text
pg_cron (1h) → Edge Function generate-notifications
                    ↓
              notifications table (com realtime)
                    ↓
              useNotifications hook (subscribe)
                    ↓
              NotificationCenter (sino + dropdown)
```

