// CSA BASIC scores — metadata and intervention thresholds.
//
// FMCSA publishes the Intervention Threshold per BASIC and per "carrier
// operation". A carrier whose score crosses the threshold becomes eligible
// for FMCSA intervention (investigations, warning letters, etc.) — so the
// threshold is the right alarm line for the agency to watch.
//
// Thresholds below are for "General" passenger/property carriers; hazmat
// haulers and passenger carriers have stricter limits (60/65). Agency users
// can override per client in a later iteration.

export type Basic =
  | "unsafe_driving"
  | "hours_of_service"
  | "driver_fitness"
  | "controlled_substances"
  | "vehicle_maintenance"
  | "hazmat_compliance"
  | "crash_indicator";

export const BASICS: Array<{ key: Basic; labelKey: string; threshold: number; color: string }> = [
  { key: "unsafe_driving",         labelKey: "csa.basic.unsafeDriving",         threshold: 65, color: "#ef4444" },
  { key: "hours_of_service",       labelKey: "csa.basic.hoursOfService",        threshold: 65, color: "#f97316" },
  { key: "driver_fitness",         labelKey: "csa.basic.driverFitness",         threshold: 80, color: "#eab308" },
  { key: "controlled_substances",  labelKey: "csa.basic.controlledSubstances",  threshold: 80, color: "#22c55e" },
  { key: "vehicle_maintenance",    labelKey: "csa.basic.vehicleMaintenance",    threshold: 80, color: "#06b6d4" },
  { key: "hazmat_compliance",      labelKey: "csa.basic.hazmatCompliance",      threshold: 80, color: "#6366f1" },
  { key: "crash_indicator",        labelKey: "csa.basic.crashIndicator",        threshold: 65, color: "#a855f7" },
];

export function scoreLevel(score: number | null | undefined, threshold: number): "ok" | "watch" | "alert" {
  if (score == null) return "ok";
  if (score >= threshold) return "alert";
  if (score >= threshold - 15) return "watch";
  return "ok";
}
