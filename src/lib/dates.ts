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
