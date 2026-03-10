

# Google Calendar Integration

## Contexto

Você já criou o projeto no Google Cloud Console. Agora precisa:

1. **No Google Cloud Console:**
   - Ativar a **Google Calendar API**
   - Criar credenciais **OAuth 2.0 Client ID** (tipo: Web Application)
   - Em **Authorized redirect URIs**, adicionar: `https://zidfrlzgftaqhnvedpnm.supabase.co/functions/v1/google-calendar-callback`
   - Copiar o **Client ID** e **Client Secret**

2. **No Lovable:** Vou pedir para você salvar o Client ID e Secret como secrets seguros

## O que será implementado

### Backend (Edge Functions)

| Função | Descrição |
|---|---|
| `google-calendar-auth` | Gera URL de autorização OAuth e redireciona o usuário pro Google |
| `google-calendar-callback` | Recebe o código de retorno do Google, troca por tokens, salva no banco |
| `google-calendar-sync` | Lê permits com vencimento e cria/atualiza eventos no Google Calendar do usuário |

### Banco de dados

Nova tabela `google_calendar_tokens` para armazenar tokens OAuth por usuário:
- `user_id`, `access_token`, `refresh_token`, `expires_at`, `calendar_id`

### Frontend

| Arquivo | Mudança |
|---|---|
| `src/pages/SettingsPage.tsx` | Remover cards WhatsApp/SMS/Email. Manter só Google Calendar com botão Conectar/Desconectar e status |
| `src/lib/translations.ts` | Novas chaves para status de conexão |

### Fluxo

```text
Usuário clica "Conectar" → Edge function gera URL OAuth → 
Google pede permissão → Callback salva tokens → 
Usuário clica "Sincronizar" → Edge function cria eventos no Calendar
```

### Arquivos criados/modificados

- `supabase/functions/google-calendar-auth/index.ts` — novo
- `supabase/functions/google-calendar-callback/index.ts` — novo  
- `supabase/functions/google-calendar-sync/index.ts` — novo
- `src/pages/SettingsPage.tsx` — redesign
- `src/lib/translations.ts` — novas chaves
- `supabase/config.toml` — registrar novas functions
- Migration: tabela `google_calendar_tokens`

## Pré-requisito

Antes de implementar, vou precisar que você salve o **Google Client ID** e **Google Client Secret** como secrets seguros no projeto.

