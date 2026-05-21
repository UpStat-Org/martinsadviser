// Pre-populated US trucking compliance deadlines.
//
// All filing deadlines repeat on a fixed annual or quarterly schedule, so the
// "calendar" is a generator over date ranges rather than a stored table. The
// list below covers the federal + state filings that an agency handles for
// permit-services clients. The lib only emits structured data — i18n of the
// title/description is the component's job (so the same generator powers both
// the in-app UI and the .ics export).

export type ComplianceEventCategory =
  | "ifta"
  | "kyu"
  | "nm"
  | "hvut"
  | "mcs150"
  | "ucr";

export type EventKind = "iftaQuarter" | "kyuQuarter" | "nmQuarter" | "hvutAnnual" | "ucrAnnual";

export interface ComplianceEvent {
  date: string; // ISO YYYY-MM-DD
  category: ComplianceEventCategory;
  kind: EventKind;
  /** Localised "Q1 (Jan-Mar)" — empty for annual events. */
  periodKey: "q1" | "q2" | "q3" | "q4" | null;
}

// Quarterly tax filings — same due dates for IFTA, KYU, NM Weight Distance.
const QUARTER_DUE = [
  { quarter: 1, monthIndex: 3, day: 30, key: "q1" as const }, // Apr 30
  { quarter: 2, monthIndex: 6, day: 31, key: "q2" as const }, // Jul 31
  { quarter: 3, monthIndex: 9, day: 31, key: "q3" as const }, // Oct 31
  { quarter: 4, monthIndex: 0, day: 31, key: "q4" as const }, // Jan 31 next year
];

function isoDate(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

function quarterFilings(year: number, category: ComplianceEventCategory, kind: EventKind): ComplianceEvent[] {
  return QUARTER_DUE.map((q) => ({
    date: isoDate(q.quarter === 4 ? year + 1 : year, q.monthIndex, q.day),
    category,
    kind,
    periodKey: q.key,
  }));
}

function annualEvents(year: number): ComplianceEvent[] {
  return [
    {
      date: isoDate(year, 7, 31), // Aug 31
      category: "hvut",
      kind: "hvutAnnual",
      periodKey: null,
    },
    {
      date: isoDate(year, 11, 31), // Dec 31 (clamped by JS)
      category: "ucr",
      kind: "ucrAnnual",
      periodKey: null,
    },
  ];
}

export function generateEvents(rangeStart: Date, rangeEnd: Date): ComplianceEvent[] {
  const events: ComplianceEvent[] = [];
  const startYear = rangeStart.getUTCFullYear();
  const endYear = rangeEnd.getUTCFullYear();

  // Generate one year before/after to cover Q4 spillover and DOM clamping.
  for (let y = startYear - 1; y <= endYear + 1; y++) {
    events.push(...quarterFilings(y, "ifta", "iftaQuarter"));
    events.push(...quarterFilings(y, "kyu", "kyuQuarter"));
    events.push(...quarterFilings(y, "nm", "nmQuarter"));
    events.push(...annualEvents(y));
  }

  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();
  return events
    .filter((e) => {
      const ms = new Date(e.date).getTime();
      return ms >= startMs && ms <= endMs;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const CATEGORY_META: Record<
  ComplianceEventCategory,
  { labelKey: string; gradient: string; color: string }
> = {
  ifta: { labelKey: "complianceCal.cat.ifta", gradient: "from-indigo-500 to-violet-500", color: "indigo" },
  kyu: { labelKey: "complianceCal.cat.kyu", gradient: "from-amber-500 to-orange-500", color: "amber" },
  nm: { labelKey: "complianceCal.cat.nm", gradient: "from-rose-500 to-red-500", color: "rose" },
  hvut: { labelKey: "complianceCal.cat.hvut", gradient: "from-emerald-500 to-teal-500", color: "emerald" },
  mcs150: { labelKey: "complianceCal.cat.mcs150", gradient: "from-blue-500 to-cyan-500", color: "blue" },
  ucr: { labelKey: "complianceCal.cat.ucr", gradient: "from-fuchsia-500 to-pink-500", color: "fuchsia" },
};

/**
 * Renders the localised title for an event. The component passes its
 * useLanguage `t` so the same logic works in pt/en/es.
 */
export function eventTitle(e: ComplianceEvent, t: (key: string) => string): string {
  switch (e.kind) {
    case "iftaQuarter":
      return t("complianceCal.event.iftaTitle").replace("{period}", t(`complianceCal.quarter.${e.periodKey!}`));
    case "kyuQuarter":
      return t("complianceCal.event.kyuTitle").replace("{period}", t(`complianceCal.quarter.${e.periodKey!}`));
    case "nmQuarter":
      return t("complianceCal.event.nmTitle").replace("{period}", t(`complianceCal.quarter.${e.periodKey!}`));
    case "hvutAnnual":
      return t("complianceCal.event.hvutTitle");
    case "ucrAnnual":
      return t("complianceCal.event.ucrTitle");
  }
}

export function eventDescription(e: ComplianceEvent, t: (key: string) => string): string {
  switch (e.kind) {
    case "iftaQuarter":
      return t("complianceCal.event.iftaDesc").replace("{period}", t(`complianceCal.quarter.${e.periodKey!}`));
    case "kyuQuarter":
      return t("complianceCal.event.kyuDesc").replace("{period}", t(`complianceCal.quarter.${e.periodKey!}`));
    case "nmQuarter":
      return t("complianceCal.event.nmDesc").replace("{period}", t(`complianceCal.quarter.${e.periodKey!}`));
    case "hvutAnnual":
      return t("complianceCal.event.hvutDesc");
    case "ucrAnnual":
      return t("complianceCal.event.ucrDesc");
  }
}

// Generate iCalendar (RFC 5545) export so users can subscribe in Google/
// Outlook. Events are all-day VEVENTs (DTSTART;VALUE=DATE).
export function toICS(events: ComplianceEvent[], t: (key: string) => string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MartinsAdviser//Compliance Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of events) {
    const dt = e.date.replace(/-/g, "");
    const uid = `${dt}-${e.category}@martinsadviser`;
    const dtEnd = new Date(new Date(e.date).getTime() + 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART;VALUE=DATE:${dt}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${eventTitle(e, t)}`,
      `DESCRIPTION:${eventDescription(e, t).replace(/\n/g, "\\n")}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
