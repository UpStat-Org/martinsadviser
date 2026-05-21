// Drug testing random selection
//
// FMCSA annual minimum random testing rates (49 CFR §382.305):
//   - 50% drug testing rate
//   - 10% alcohol testing rate
//
// We split that evenly across the four quarters, rounding up so the agency
// always meets the annual minimum even if pool size shrinks mid-year.

import type { Driver } from "@/hooks/useDrivers";

const ANNUAL_DRUG_RATE = 0.5;
const ANNUAL_ALCOHOL_RATE = 0.1;

export interface PoolSplit {
  poolSize: number;
  drugCount: number;
  alcoholCount: number;
  drugDrivers: Driver[];
  alcoholDrivers: Driver[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function currentQuarterTag(now: Date = new Date()): string {
  const month = now.getUTCMonth();
  const q = Math.floor(month / 3) + 1;
  return `${now.getUTCFullYear()}-Q${q}`;
}

export function isDriverInPool(d: Driver): boolean {
  return d.status === "active" && !!d.cdl_number;
}

export function drawQuarterlySelection(
  drivers: Driver[],
  excludeIds: Set<string> = new Set(),
): PoolSplit {
  const pool = drivers.filter((d) => isDriverInPool(d) && !excludeIds.has(d.id));
  const drugCount = Math.ceil((pool.length * ANNUAL_DRUG_RATE) / 4);
  const alcoholCount = Math.ceil((pool.length * ANNUAL_ALCOHOL_RATE) / 4);

  const shuffled = shuffle(pool);
  const drugDrivers = shuffled.slice(0, Math.min(drugCount, shuffled.length));
  // Alcohol selections come from the rest of the pool — agencies prefer to
  // avoid the same driver getting both substances drawn in the same quarter.
  const remaining = shuffled.slice(drugCount);
  const alcoholDrivers = remaining.slice(0, Math.min(alcoholCount, remaining.length));

  return { poolSize: pool.length, drugCount, alcoholCount, drugDrivers, alcoholDrivers };
}
