

# Sistema de Gerenciamento de Clientes — Transportadoras (Trucking)

## Visão Geral
Sistema para gerenciar empresas de transporte (clientes) e seus caminhões, com controle de permits, envio de mensagens automáticas e integração com Google Calendar. Login para equipe pequena (2-5 usuários).

---

## 1. Autenticação e Controle de Acesso
- Login por email/senha com Supabase Auth
- Perfis de usuário com papéis (admin, operador) para controlar quem pode editar vs. apenas visualizar
- Dashboard principal após login

## 2. Gestão de Clientes (Transportadoras)
- Cadastro de empresas: nome, USDOT number, MC number, contato principal, telefone, email, endereço
- Lista de clientes com busca e filtros
- Página de detalhe do cliente mostrando todos os caminhões e permits associados

## 3. Gestão de Caminhões (Veículos)
- Cadastro de caminhões vinculados a um cliente: placa, VIN, ano, modelo, status (ativo/inativo)
- Visualização da frota por cliente

## 4. Gerenciamento de Permits
- Cadastro de permits vinculados a caminhão/cliente: tipo de permit (IRP, IFTA, UCR, Oversize/Overweight, State Permits, etc.), número, estado emissor, data de emissão, data de vencimento, status (ativo, pendente, vencido, em renovação)
- Upload de documentos (PDF do permit, comprovantes)
- Dashboard com visão geral: permits vencendo nos próximos 30/60/90 dias
- Alertas visuais para permits próximos do vencimento ou já vencidos
- Filtros por tipo, status, cliente, caminhão

## 5. Mensagens Automáticas Programadas
- Editor de mensagens com templates (ex: "Seu permit IRP vence em 30 dias")
- Agendamento: escolher data/hora de envio
- Canais: WhatsApp, SMS e Email (integração via edge functions com os provedores que você já usa — configuraremos juntos)
- Histórico de mensagens enviadas por cliente
- Possibilidade de criar automações: ex. "enviar lembrete 30 dias antes do vencimento do permit"

## 6. Integração Google Calendar
- Sincronizar datas de vencimento de permits como eventos no Google Calendar
- Criar eventos automaticamente ao cadastrar/atualizar permits
- Lembretes configuráveis no calendário

## 7. Dashboard Principal
- Resumo: total de clientes, caminhões, permits ativos/vencendo
- Lista de ações pendentes (permits a renovar, mensagens agendadas)
- Gráficos de permits por status e por tipo

---

## Backend
- Supabase (Lovable Cloud) para banco de dados, autenticação, storage de documentos e edge functions
- Edge functions para integração com provedores de mensagem e Google Calendar

## Próximos Passos Após Implementação
- Configurar seus provedores de WhatsApp/SMS/Email (precisarei das informações das APIs que você já tem)
- Conectar Google Calendar via OAuth

