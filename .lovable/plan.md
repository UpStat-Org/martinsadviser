

# Redesign das telas de Login e Signup

## Conceito visual

Elevar o design atual para um nivel premium inspirado em apps como Linear, Vercel e Stripe. O layout split-screen sera mantido mas com muito mais personalidade e refinamento.

## Mudancas principais

### Painel esquerdo (branding)
- Gradiente mais rico e profundo com multiplas camadas (mesh gradient effect via CSS)
- Grid pattern sutil no fundo ao inves de circulos simples
- Icones/badges flutuantes com glassmorphism mostrando features do produto (Shield, BarChart, Users, Clock)
- Animacoes staggered nos elementos decorativos
- Testimonial ou stat badges flutuantes com blur

### Painel direito (formulario)
- Remover o Card wrapper, usar layout mais aberto e clean
- Inputs com icones inline (Mail, Lock, User)
- Divider decorativo com "ou" (preparado para futuros social logins)
- Melhor hierarquia visual com spacing mais generoso
- Efeito de focus mais elegante nos inputs com glow sutil
- Botao com gradiente e hover animado
- Footer com links mais refinados

### Animacoes
- Adicionar keyframes: `float`, `shimmer`, `slide-in-left`
- Elementos decorativos com animacao float suave
- Staggered fade-in nos campos do formulario

### Tela de sucesso (signup)
- Layout full com confetti-style decorativo
- Card mais visualmente impactante

## Arquivos modificados
- `src/pages/Login.tsx` - redesign completo
- `src/pages/Signup.tsx` - redesign completo (mesma linguagem visual)
- `tailwind.config.ts` - novas keyframes (float, shimmer)
- `src/index.css` - classes utilitarias extras se necessario

## Abordagem
Ambas as paginas compartilharao a mesma linguagem visual. O codigo sera atualizado inline sem necessidade de novos componentes compartilhados, mantendo simplicidade.

