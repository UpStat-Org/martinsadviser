

# Redesign Visual — Moderno e Limpo (estilo SaaS Premium)

O projeto inteiro receberá um upgrade visual inspirado em dashboards SaaS modernos (Linear, Stripe, Vercel). Todas as 4 áreas priorizadas serão atualizadas.

---

## 1. Nova Paleta de Cores e Tokens CSS (`src/index.css`)

Trocar a paleta atual por uma mais sofisticada com melhor contraste e hierarquia:

- **Background**: cinza mais quente e sutil (menos azulado)
- **Cards**: fundo branco puro com sombras mais suaves e multi-camada (`shadow-sm` → `shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]`)
- **Primary**: azul mais vibrante e saturado (indigo-ish, ~`230 75% 55%`)
- **Success/Warning/Destructive**: tons mais modernos e dessaturados
- **Sidebar**: gradiente escuro mais refinado com tons de slate ao invés de blue-gray
- Adicionar variáveis `--chart-1` a `--chart-5` para consistência nos gráficos

## 2. Login e Signup (`Login.tsx`, `Signup.tsx`)

- Layout split-screen: lado esquerdo com branding (gradiente + ilustração/pattern geométrico), lado direito com formulário
- Card do formulário com bordas mais suaves, sombra elevada
- Logo maior com animação sutil de entrada
- Inputs com estilo mais refinado (bordas mais leves, focus ring mais visível)
- Botão primary com gradiente sutil e hover elegante

## 3. Sidebar (`AppSidebar.tsx`)

- Background com gradiente vertical sutil (slate-900 → slate-950)
- Logo/branding redesenhado com tipografia mais destacada
- Nav items: indicador ativo com barra lateral colorida (ao invés de apenas background)
- Hover com transição mais suave e feedback visual melhor
- Ícones com cores semânticas (ex: vermelho no logout, azul nos itens principais)
- Separadores visuais entre seções (nav principal, admin, config)
- Tooltip nos ícones quando colapsado

## 4. Dashboard (`Dashboard.tsx`)

- Metric cards: gradiente de fundo sutil por tipo (azul para geral, verde para ativos, amarelo para alertas)
- Ícones dentro de círculos coloridos ao invés de soltos
- Gráficos com cores mais consistentes e labels melhoradas
- Cards com header mais limpo, separador visual sutil
- Seção de permits urgentes com destaque visual mais forte (borda lateral colorida)
- Animação de entrada sutil nos cards (fade-in)

## 5. Tabelas e Listagens (`Clients.tsx`, `Trucks.tsx`, `Permits.tsx`, `Messages.tsx`)

- Header da página com melhor hierarquia (título maior, subtítulo com mais espaçamento)
- Barra de busca com design mais integrado (background sutil, ícone mais destaque)
- Tabelas: hover rows com cor mais visível, bordas entre linhas mais sutis
- Badges de status redesenhados: pill-shape com cores de fundo mais pastéis
- Botões de ação com hover states melhor definidos
- Empty states com ilustração/ícone maior e mais convidativo

## 6. Componentes Globais

- **`src/App.css`**: Limpar estilos obsoletos do template Vite
- **`tailwind.config.ts`**: Adicionar novas keyframes (`fade-in`, `slide-up`) para animações de entrada
- **`card.tsx`**: Sombra padrão mais refinada
- **`button.tsx`**: Variante primary com gradiente sutil

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/index.css` | Nova paleta de cores, variáveis de chart |
| `src/App.css` | Limpar estilos Vite obsoletos |
| `tailwind.config.ts` | Novas animações (fade-in, slide-up) |
| `src/components/ui/card.tsx` | Sombra refinada |
| `src/components/ui/button.tsx` | Gradiente sutil no primary |
| `src/pages/Login.tsx` | Layout split-screen com branding |
| `src/pages/Signup.tsx` | Layout split-screen com branding |
| `src/components/AppSidebar.tsx` | Gradiente, indicador ativo, ícones semânticos |
| `src/pages/Dashboard.tsx` | Metric cards coloridos, ícones em circles |
| `src/pages/Clients.tsx` | Tabela e badges refinados |
| `src/pages/Trucks.tsx` | Tabela e badges refinados |
| `src/pages/Permits.tsx` | Tabela e badges refinados |
| `src/pages/Messages.tsx` | Tabs e tabela refinados |
| `src/components/AppLayout.tsx` | Header refinado |

Nenhuma mudança de banco de dados ou backend -- apenas visual/CSS/JSX.

