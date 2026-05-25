// MCS-150 biennial update logic
//
// FMCSA assigns each carrier a deterministic 2-year filing cadence based on
// their USDOT number:
//
//   - last digit          → filing MONTH (1=Jan ... 9=Sep, 0=Oct)
//   - next-to-last digit  → odd-numbered year (odd) or even-numbered year (even)
//
// When we have a recorded `lastFiledAt`, the next due is just lastFiledAt + 24
// months, snapped to the same day-of-month. When we don't, we project forward
// from the schedule.

const MONTH_BY_LAST_DIGIT: Record<string, number> = {
  "1": 0, // Jan
  "2": 1, // Feb
  "3": 2, // Mar
  "4": 3, // Apr
  "5": 4, // May
  "6": 5, // Jun
  "7": 6, // Jul
  "8": 7, // Aug
  "9": 8, // Sep
  "0": 9, // Oct
};

export interface Mcs150Status {
  /** ISO date of the next due filing. null when DOT is missing / unparseable. */
  nextDueOn: string | null;
  /** Days until the next due date — negative when overdue. */
  daysUntilDue: number | null;
  /** 'overdue' | 'due_soon' (≤90d) | 'ok' | 'unknown'. */
  state: "overdue" | "due_soon" | "ok" | "unknown";
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Maximum staleness for "still the active deadline" before we roll forward to
// the next cycle. A carrier who missed the filing month is overdue against
// *this* cycle's deadline, not magically pushed to the next one — surface
// that for ~12 months so the card keeps screaming "file it now".
const STALE_DEADLINE_THRESHOLD_DAYS = 365;

function lastDayOfMonthUTC(year: number, monthIndex: number): number {
  // monthIndex 0-11. Day 0 of the *next* month = last day of this month.
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function computeFromSchedule(dot: string, now: Date): Date | null {
  const digits = dot.replace(/\D/g, "");
  if (digits.length < 2) return null;
  const last = digits[digits.length - 1];
  const nextToLast = digits[digits.length - 2];
  const month = MONTH_BY_LAST_DIGIT[last];
  if (month === undefined) return null;

  const wantsOdd = parseInt(nextToLast, 10) % 2 === 1;
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  // Walk from two cycles ago (to catch recent overdue cases) up to a couple of
  // future cycles. Candidate date = last day of the filing month, which is the
  // actual deadline. The first candidate whose deadline is in the future *or*
  // within STALE_DEADLINE_THRESHOLD_DAYS in the past is the one we surface.
  for (let i = -2; i <= 4; i++) {
    const candidateYear = now.getUTCFullYear() + i;
    const yearParity = candidateYear % 2 === 1;
    if (yearParity !== wantsOdd) continue;
    const lastDay = lastDayOfMonthUTC(candidateYear, month);
    const candidate = new Date(Date.UTC(candidateYear, month, lastDay));
    const daysFromNow = Math.ceil((candidate.getTime() - todayMs) / 86_400_000);
    if (daysFromNow >= -STALE_DEADLINE_THRESHOLD_DAYS) {
      return candidate;
    }
  }
  return null;
}

function addMonthsUTC(d: Date, months: number): Date {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
  return target;
}

export function mcs150Status(
  dot: string | null | undefined,
  lastFiledAt: string | null | undefined,
  now: Date = new Date(),
): Mcs150Status {
  let nextDue: Date | null = null;
  if (lastFiledAt) {
    nextDue = addMonthsUTC(new Date(lastFiledAt), 24);
  } else if (dot) {
    nextDue = computeFromSchedule(dot, now);
  }

  if (!nextDue) {
    return { nextDueOn: null, daysUntilDue: null, state: "unknown" };
  }

  const days = Math.ceil((nextDue.getTime() - now.getTime()) / 86_400_000);
  let state: Mcs150Status["state"] = "ok";
  if (days < 0) state = "overdue";
  else if (days <= 90) state = "due_soon";

  return { nextDueOn: toISODate(nextDue), daysUntilDue: days, state };
}
