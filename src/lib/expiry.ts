// ---------------------------------------------------------------------------
// Classificação de vencimento — primitivo compartilhado.
//
// Este código nasceu dentro de `lib/dqf.ts`, servindo o Driver Qualification
// File americano. Mas a regra não tem nada de americana: é "uma data comparada
// com hoje, com uma janela de aviso antes". O núcleo regulatório brasileiro
// precisa exatamente disso para CNH, MOPP, toxicológico, ASO, CRLV, tacógrafo
// e RNTRC — e importar de um módulo chamado `dqf` para calcular a validade de
// um CRLV seria mentir sobre o que o código faz.
//
// Então o primitivo mora aqui e `lib/dqf.ts` o reexporta. Nenhum call site
// existente mudou: quem importava `expiryStatus` de `@/lib/dqf` continua
// importando de lá.
// ---------------------------------------------------------------------------

export const DAY_MS = 86_400_000;

/** Janela padrão de aviso: um documento vence "em breve" a 30 dias do fim. */
export const SOON_DAYS = 30;

export type ExpiryState = "missing" | "expired" | "expiring" | "valid";

export interface ExpiryInfo {
  date: string | null;
  /** Dias inteiros até vencer; negativo quando já passou, null quando não há data. */
  daysUntil: number | null;
  state: ExpiryState;
}

/**
 * Classifica uma data de validade em relação a `now`.
 *
 * `missing` é um estado próprio, e não um apelido de `expired`: documento não
 * cadastrado e documento vencido pedem ações diferentes — um precisa ser
 * lançado, o outro precisa ser renovado.
 */
export function expiryStatus(
  date: string | null | undefined,
  now: number = Date.now(),
  soonDays = SOON_DAYS,
): ExpiryInfo {
  if (!date) return { date: null, daysUntil: null, state: "missing" };
  const daysUntil = Math.ceil((new Date(date).getTime() - now) / DAY_MS);
  let state: ExpiryState;
  if (daysUntil < 0) state = "expired";
  else if (daysUntil <= soonDays) state = "expiring";
  else state = "valid";
  return { date, daysUntil, state };
}

/**
 * Soma meses a uma data no calendário, preservando o dia sempre que ele
 * existir no mês de destino.
 *
 * Precisa existir porque as validades brasileiras são contadas em meses, não
 * em dias: o exame toxicológico vale 30 meses, o MOPP 60. Somar
 * `meses * 30 * DAY_MS` erra em até cinco dias num período de 30 meses — o
 * bastante para o sistema dizer "vence amanhã" no dia seguinte ao vencimento
 * real, que é o pior erro possível num alerta de compliance.
 *
 * 31 de janeiro + 1 mês cai em 28 de fevereiro (ou 29 em ano bissexto), e não
 * transborda para março, que é o que `setMonth` faz sozinho.
 */
export function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date.getTime());
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDayOfTargetMonth = new Date(
    result.getFullYear(), result.getMonth() + 1, 0,
  ).getDate();
  result.setDate(Math.min(day, lastDayOfTargetMonth));
  return result;
}

/** Data de validade `months` meses depois da emissão, em ISO (yyyy-mm-dd). */
export function expiryFromIssue(issuedOn: string | null | undefined, months: number): string | null {
  if (!issuedOn) return null;
  const issued = new Date(issuedOn);
  if (Number.isNaN(issued.getTime())) return null;
  return addMonths(issued, months).toISOString().slice(0, 10);
}
