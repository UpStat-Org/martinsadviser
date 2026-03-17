

## Problema

O relatório da IA é retornado em **Markdown** mas está sendo renderizado como texto puro (`{aiReport}`), então os `**`, `###`, `*` aparecem literalmente em vez de formatados.

## Solução

Instalar a biblioteca `react-markdown` e usá-la para renderizar o conteúdo do relatório como HTML formatado dentro do dialog.

### Mudanças

1. **Adicionar dependência**: `react-markdown` (já amplamente usada para este caso).

2. **`src/pages/ClientDetail.tsx`** (~linha 319-321): Substituir `{aiReport}` por `<ReactMarkdown>{aiReport}</ReactMarkdown>` dentro da div com classes `prose`, que já estão configuradas para estilizar headings, listas, bold, etc.

```tsx
import ReactMarkdown from "react-markdown";

// Na renderização:
<div className="prose prose-sm dark:prose-invert max-w-none">
  <ReactMarkdown>{aiReport || ""}</ReactMarkdown>
</div>
```

Isso fará com que `**texto**` apareça em **negrito**, `###` vire heading, listas com `*` fiquem formatadas, etc. — sem nenhuma mudança na Edge Function.

