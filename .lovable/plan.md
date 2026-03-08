

## Mensagens: Templates + Agendamento

### Resumo
Implementar o sistema de templates de mensagem e agendamento manual de envios para clientes, com persistência no banco de dados.

### Banco de Dados

Duas novas tabelas:

**`message_templates`** — armazena modelos reutilizáveis
- `id`, `user_id`, `name`, `subject`, `body`, `channel` (email/sms/whatsapp), `created_at`, `updated_at`

**`scheduled_messages`** — mensagens agendadas para envio
- `id`, `user_id`, `client_id` (FK clients), `template_id` (FK message_templates, nullable), `channel`, `subject`, `body`, `scheduled_at`, `status` (pending/sent/failed/cancelled), `sent_at`, `created_at`

RLS: usuários autenticados podem CRUD seus próprios registros.

### Frontend

1. **Tab "Templates"** — CRUD completo:
   - Dialog para criar/editar template (nome, canal, assunto, corpo com placeholders como `{company_name}`, `{permit_type}`)
   - Lista de templates com ações editar/excluir

2. **Tab "Agendadas"** — Agendar mensagens:
   - Dialog "Nova Mensagem" com: seleção de cliente, canal, template opcional (preenche campos), assunto, corpo, data/hora de agendamento
   - Lista de mensagens pendentes com opção de cancelar

3. **Tab "Enviadas"** — Histórico:
   - Lista de mensagens com status sent/failed, data de envio, cliente e canal

4. **Hook `useMessages.ts`** — queries e mutations para ambas as tabelas

### Arquivos
- Nova migração SQL (tabelas + RLS)
- `src/hooks/useMessages.ts`
- `src/components/MessageTemplateDialog.tsx`
- `src/components/ScheduleMessageDialog.tsx`
- `src/pages/Messages.tsx` (reescrita completa)

