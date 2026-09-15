import type { Language } from "@/lib/translations";

// Date-fns pattern strings can't express "weekday, month day" in a way that
// reorders per language — writing "EEEE, dd 'de' MMMM" hard-codes Portuguese
// grammar and leaks the literal "de" into English and Spanish. Intl knows the
// right order and connectors for each locale, so the localized long forms go
// through it instead.
//
// Fixed numeric formats (MM/dd/yyyy and friends) stay as date-fns patterns at
// the call sites — those are deliberately US-style everywhere, not localized.

const BCP47: Record<Language, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
};

function fmt(language: Language, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(BCP47[language] ?? BCP47.en, options);
}

/** "Tuesday, July 28" · "terça-feira, 28 de julho" · "martes, 28 de julio" */
export function formatWeekdayLong(date: Date, language: Language): string {
  return fmt(language, { weekday: "long", month: "long", day: "numeric" }).format(date);
}

/** "July 28, 2026" · "28 de julho de 2026" · "28 de julio de 2026" */
export function formatDateLong(date: Date, language: Language): string {
  return fmt(language, { year: "numeric", month: "long", day: "numeric" }).format(date);
}

/** "Jul 28, 2026" · "28 de jul. de 2026" · "28 jul 2026" */
export function formatDateMedium(date: Date, language: Language): string {
  return fmt(language, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

/** "Jul 28" · "28 de jul." · "28 jul" — compact, for dense lists. */
export function formatDayMonthShort(date: Date, language: Language): string {
  return fmt(language, { month: "short", day: "numeric" }).format(date);
}

// ---------------------------------------------------------------------------
// Formatos numéricos.
//
// O comentário no topo deste arquivo dizia que os formatos numéricos ficam
// "deliberately US-style everywhere" como date-fns patterns nos call sites.
// Isso valia enquanto o produto atendia só os EUA. Com organização brasileira,
// "03/04/2026" hard-coded como MM/dd/yyyy é lido como 3 de abril por um
// americano e como 4 de março por um brasileiro — a data mais perigosa do
// sistema, porque parece certa nos dois casos e não dá erro nenhum.
//
// Estas funções substituem os `format(d, "MM/dd/yyyy")` espalhados pelos
// componentes. Intl escolhe a ordem certa por locale: en-US → 07/28/2026,
// pt-BR → 28/07/2026, es-ES → 28/07/2026.
// ---------------------------------------------------------------------------

/** "07/28/2026" · "28/07/2026" — data numérica completa. */
export function formatDateNumeric(date: Date, language: Language): string {
  return fmt(language, { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** "07/28" · "28/07" — dia e mês, pra colunas estreitas. */
export function formatDayMonthNumeric(date: Date, language: Language): string {
  return fmt(language, { month: "2-digit", day: "2-digit" }).format(date);
}

/** "07/28/2026, 14:30" · "28/07/2026, 14:30" — data + hora. */
export function formatDateTimeNumeric(date: Date, language: Language): string {
  return fmt(language, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
    // Hora sempre em 24h: o público operacional (despacho, compliance) lê
    // horário assim nos dois países, e "2:30 PM" numa tabela densa ocupa
    // mais espaço sem ganhar clareza.
    hour12: false,
  }).format(date);
}
