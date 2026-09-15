import { useCallback, useMemo } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  formatMoney,
  CURRENCY_SYMBOL,
  type CountryCode,
  type Currency,
  type FormatMoneyOptions,
} from "@/lib/region";
import {
  formatDateNumeric,
  formatDayMonthNumeric,
  formatDateTimeNumeric,
} from "@/lib/dates";
import type { Language } from "@/lib/translations";

/**
 * Ponto único de acesso pra tudo que depende de região: moeda da organização
 * e formatos de data do idioma ativo.
 *
 * Existe pra que um componente não precise juntar `useOrg()` + `useLanguage()`
 * e reimplementar a formatação. Antes disso cada arquivo declarava o seu
 * próprio `const usd = new Intl.NumberFormat("en-US", …)` no topo — 19 cópias,
 * todas fixas em dólar, impossíveis de mudar sem varrer o projeto.
 *
 * As funções devolvidas já vêm ligadas à moeda/idioma correntes, então o call
 * site vira `money(invoice.amount)` e `dateNumeric(new Date(p.expiration_date))`.
 */
export function useRegion() {
  const { country, currency } = useOrg();
  const { language } = useLanguage();

  const money = useCallback(
    (value: number | string | null | undefined, options?: FormatMoneyOptions) =>
      formatMoney(value, currency, options),
    [currency],
  );

  // Variante compacta: sem centavos. Usada nos cards de resumo (manutenção,
  // seguro, lucro por cliente) onde a precisão de centavo só polui o número.
  const moneyCompact = useCallback(
    (value: number | string | null | undefined, options?: FormatMoneyOptions) =>
      formatMoney(value, currency, { maximumFractionDigits: 0, ...options }),
    [currency],
  );

  const dateNumeric = useCallback(
    (date: Date) => formatDateNumeric(date, language),
    [language],
  );
  const dayMonthNumeric = useCallback(
    (date: Date) => formatDayMonthNumeric(date, language),
    [language],
  );
  const dateTimeNumeric = useCallback(
    (date: Date) => formatDateTimeNumeric(date, language),
    [language],
  );

  return useMemo(
    () => ({
      country,
      currency,
      language,
      currencySymbol: CURRENCY_SYMBOL[currency],
      isUS: country === "US",
      isBR: country === "BR",
      money,
      moneyCompact,
      dateNumeric,
      dayMonthNumeric,
      dateTimeNumeric,
    }),
    [country, currency, language, money, moneyCompact, dateNumeric, dayMonthNumeric, dateTimeNumeric],
  );
}

export type Region = ReturnType<typeof useRegion>;
export type { CountryCode, Currency, Language };
