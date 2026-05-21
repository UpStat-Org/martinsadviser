// FMCSA New Entrant program logic.
//
// The 18-month monitoring window starts on the USDOT issue date (the carrier
// gets registered) and ends 540 days later. During this window FMCSA may
// conduct a Safety Audit. The audit itself is typically scheduled within
// the first 12 months — once a carrier is past month 12 without an audit,
// the agency should escalate.

const PROGRAM_DAYS = 540; // 18 months
const AUDIT_TYPICAL_BY_DAYS = 365; // ~12 months in

export type NewEntrantState = "active" | "audit_overdue" | "ending_soon" | "completed" | "not_in_program";

export interface NewEntrantStatus {
  state: NewEntrantState;
  daysInProgram: number;
  daysUntilEnd: number;
  endsOn: string | null;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function newEntrantStatus(
  startOn: string | null | undefined,
  now: Date = new Date(),
): NewEntrantStatus {
  if (!startOn) {
    return { state: "not_in_program", daysInProgram: 0, daysUntilEnd: 0, endsOn: null };
  }
  const start = new Date(startOn);
  const end = new Date(start.getTime() + PROGRAM_DAYS * 86_400_000);
  const daysInProgram = daysBetween(start, now);
  const daysUntilEnd = daysBetween(now, end);

  let state: NewEntrantState;
  if (daysUntilEnd < 0) state = "completed";
  else if (daysUntilEnd <= 60) state = "ending_soon";
  else if (daysInProgram > AUDIT_TYPICAL_BY_DAYS) state = "audit_overdue";
  else state = "active";

  return { state, daysInProgram, daysUntilEnd, endsOn: toISODate(end) };
}

// Requirements checklist — what FMCSA expects the carrier to have in place
// before/during the New Entrant audit. Used as a UI checklist; ticking items
// here is purely client-side hint, not enforcement.
export const NEW_ENTRANT_REQUIREMENTS: Array<{ key: string; labelKey: string }> = [
  { key: "process_safety", labelKey: "newEntrant.req.processSafety" },
  { key: "driver_qualification", labelKey: "newEntrant.req.driverQualification" },
  { key: "hours_of_service", labelKey: "newEntrant.req.hoursOfService" },
  { key: "drug_alcohol", labelKey: "newEntrant.req.drugAlcohol" },
  { key: "vehicle_maintenance", labelKey: "newEntrant.req.vehicleMaintenance" },
  { key: "accident_register", labelKey: "newEntrant.req.accidentRegister" },
  { key: "psp_subscription", labelKey: "newEntrant.req.psp" },
];
