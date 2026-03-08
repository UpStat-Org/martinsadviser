

# Plano de Implementacao -- Feature 1: Dashboard de Compliance por Cliente

Como voce quer uma feature por vez, vamos comecar pela **Dashboard de Compliance por Cliente** -- uma visao consolidada na pagina de detalhe do cliente mostrando a saude dos permits.

---

## O que sera construido

Na pagina de detalhe do cliente (`/clients/:id`), sera adicionada uma secao de **Compliance Score** acima das tabs de trucks/permits, contendo:

- **Score visual** (0-100%) representando % de permits em dia
- **Barra de progresso** colorida (verde > 80%, amarelo 50-80%, vermelho < 50%)
- **Cards resumo**: Total de permits, Em dia, Vencendo em 30d, Vencidos
- **Mini grafico** de distribuicao (donut chart com recharts)

---

## Detalhes Tecnicos

### Arquivos modificados

1. **`src/pages/ClientDetail.tsx`**
   - Adicionar secao de compliance entre o card de info e as tabs
   - Calcular metricas a partir dos permits ja carregados (nao precisa de query nova)
   - Usar `recharts` (ja instalado) para mini donut chart
   - Cards com cores condicionais baseadas no score

2. **`src/lib/translations.ts`**
   - Adicionar chaves: `compliance.score`, `compliance.healthy`, `compliance.warning`, `compliance.critical`, `compliance.inDate`, `compliance.expiring`, `compliance.expired`, `compliance.total`

### Nenhuma mudanca no banco de dados
Todos os dados ja existem na tabela `permits`. O calculo eh feito client-side.

### Logica do Score
```text
score = (permits validos / total permits) * 100
- Verde (healthy): >= 80%
- Amarelo (warning): 50-79%
- Vermelho (critical): < 50%
```

---

## Ordem de implementacao

1. Adicionar traducoes no `translations.ts`
2. Criar componente de compliance section no `ClientDetail.tsx`
3. Testar com dados existentes

Nenhuma migracao de banco necessaria. Apenas alteracoes de UI.

