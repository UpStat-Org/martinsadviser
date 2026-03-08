

# Página de Documentação — Tutorial Completo do Sistema

## O que será feito

Criar uma nova página `/docs` acessível pela sidebar com um tutorial completo e interativo do sistema, organizado por seções com acordeões (accordion), voltado para usuários leigos.

## Estrutura da página

A documentação será organizada em seções expansíveis (accordion), cada uma cobrindo uma área do sistema:

1. **Primeiros Passos** — Login, cadastro, aprovação de conta
2. **Dashboard** — Como interpretar métricas, gráficos, permits urgentes
3. **Clientes** — Cadastro, onboarding, edição, busca, importação
4. **Caminhões** — Cadastro e gerenciamento de frotas
5. **Permits** — Cadastro, vencimentos, tipos, alertas
6. **Mensagens** — Templates, agendamento, envio, histórico
7. **Calendário** — Visualização de vencimentos e eventos
8. **Relatórios** — Exportação CSV/PDF, tipos de relatório
9. **Tarefas (Kanban)** — Quadro de tarefas, prioridades, status
10. **Financeiro** — Faturas, cobranças, controle financeiro
11. **Configurações** — Integrações (WhatsApp, SMS, Email, Calendar)
12. **Portal do Cliente** — Como funciona o acesso read-only do cliente
13. **Administração** — Gerenciamento de usuários, auditoria (admin only)

Cada seção terá:
- Ícone + título da seção
- Descrição do que a página faz
- Passo a passo numerado com instruções claras
- Dicas e observações em destaque (cards de tip)

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/DocumentationPage.tsx` | **Nova** — Página completa de documentação |
| `src/App.tsx` | Adicionar rota `/docs` |
| `src/components/AppSidebar.tsx` | Adicionar item "Documentação" na sidebar (ícone BookOpen) |
| `src/lib/translations.ts` | Adicionar chaves `nav.docs`, `docs.*` para PT/EN/ES |

## Design

- Mesmo estilo visual do redesign (cards, sombras suaves, tipografia moderna)
- Accordion do Radix UI para as seções expansíveis
- Ícones Lucide para cada seção
- Cards de dica com borda lateral colorida (azul/amarelo)
- Responsivo e com animações de entrada consistentes com o resto do app

