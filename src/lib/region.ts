// ---------------------------------------------------------------------------
// Região da organização: país, moeda e idioma.
//
// Estes três valores vivem juntos porque derivam um do outro e porque quase
// todo consumidor precisa de mais de um: uma tabela de faturas formata dinheiro
// (moeda) e datas (idioma), e o sidebar decide quais módulos existem (país).
//
// O mapeamento país → moeda/idioma é o MESMO que a migration
// 20260824120000_org_country_currency.sql aplica em
// default_currency_for_country / default_locale_for_country. As duas cópias
// precisam concordar: o banco define o valor no momento em que a org nasce,
// e o frontend sugere o default quando o admin troca o país em Configurações.
// Se divergirem, o admin vê uma sugestão diferente do que a org recebeu ao ser
// criada. Os testes em __tests__/region.test.ts travam esse contrato.
// ---------------------------------------------------------------------------

import type { Language } from "@/lib/translations";

export const COUNTRIES = ["US", "BR", "ES"] as const;
export type CountryCode = (typeof COUNTRIES)[number];

export const CURRENCIES = ["USD", "BRL", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === "string" && (COUNTRIES as readonly string[]).includes(value);
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

export function defaultCurrencyForCountry(country: CountryCode): Currency {
  switch (country) {
    case "BR": return "BRL";
    case "ES": return "EUR";
    default: return "USD";
  }
}

export function defaultLocaleForCountry(country: CountryCode): Language {
  switch (country) {
    case "BR": return "pt";
    case "ES": return "es";
    default: return "en";
  }
}

/** Símbolo curto, pra prefixar input de valor onde escrever a moeda inteira polui. */
export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  BRL: "R$",
  EUR: "€",
};

// Dinheiro é formatado no locale NATIVO da moeda, não no idioma de quem lê.
//
// A alternativa — formatar no idioma do usuário — faz o mesmo valor mudar de
// aparência conforme quem abre a tela: um usuário lendo em português veria
// "US$ 1.234,56" onde o colega em inglês vê "$1,234.56". Para dado financeiro
// isso é ruim: o número precisa ser citável entre pessoas ("a fatura de
// 1.234,56") e conferível contra o extrato do banco, que usa a convenção do
// país da moeda. Então USD sempre sai em convenção americana e BRL sempre em
// convenção brasileira, independente do idioma da interface.
const MONEY_LOCALE: Record<Currency, string> = {
  USD: "en-US",
  BRL: "pt-BR",
  EUR: "es-ES",
};

// Construir Intl.NumberFormat é caro e estes formatadores rodam por célula em
// tabelas de centenas de linhas. Cache por (moeda, casas decimais) — o conjunto
// de combinações é minúsculo e fixo.
const formatterCache = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: Currency, maximumFractionDigits: number): Intl.NumberFormat {
  const key = `${currency}:${maximumFractionDigits}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const created = new Intl.NumberFormat(MONEY_LOCALE[currency], {
    style: "currency",
    currency,
    maximumFractionDigits,
    // Sem isto o Intl usa minimumFractionDigits = 2 mesmo quando o máximo é 0,
    // e joga um RangeError quando pedimos maximumFractionDigits: 0.
    minimumFractionDigits: Math.min(2, maximumFractionDigits),
  });
  formatterCache.set(key, created);
  return created;
}

export interface FormatMoneyOptions {
  /** 0 arredonda pra unidade — usado nos cards compactos (manutenção, seguro, lucro). */
  maximumFractionDigits?: number;
  /** Texto devolvido quando o valor é null/undefined/NaN. Default: "—". */
  fallback?: string;
}

/**
 * Formata um valor monetário na moeda da organização.
 *
 * Aceita null/undefined/string porque a maioria das colunas numéricas chega do
 * PostgREST como string (`numeric` não cabe em double sem perda, então o driver
 * preserva o texto) e várias são anuláveis. Antes disso cada call site fazia o
 * seu próprio `Number(x) || 0`, o que transformava valor ausente em "$0.00" —
 * indistinguível de uma fatura legitimamente zerada.
 */
export function formatMoney(
  value: number | string | null | undefined,
  currency: Currency,
  options: FormatMoneyOptions = {},
): string {
  const { maximumFractionDigits = 2, fallback = "—" } = options;
  if (value === null || value === undefined || value === "") return fallback;

  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;

  return moneyFormatter(currency, maximumFractionDigits).format(n);
}
