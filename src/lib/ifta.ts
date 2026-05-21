// IFTA quarterly aggregation
//
// Given a set of trips and fuel purchases for a client in a quarter, plus the
// per-jurisdiction rate table, computes:
//   - total miles, total gallons, fleet MPG
//   - taxable_miles per jurisdiction (sum from trips)
//   - taxable_gallons per jurisdiction (taxable_miles / MPG)
//   - tax_paid per jurisdiction (gallons purchased × rate)
//   - tax_owed per jurisdiction (taxable_gallons × rate − tax_paid)
//   - total net tax due (sum positive owed; negative = credit)

export interface IftaTrip {
  total_miles: number;
  miles_by_jurisdiction: Record<string, number>;
}

export interface IftaFuel {
  jurisdiction: string;
  gallons: number;
}

export interface IftaRate {
  jurisdiction: string;
  rate_per_gallon: number;
}

export interface JurisdictionBreakdown {
  jurisdiction: string;
  taxable_miles: number;
  taxable_gallons: number;
  tax_paid: number;
  tax_owed: number;
  net: number; // tax_owed - tax_paid (positive = owe, negative = credit)
}

export interface IftaSummary {
  total_miles: number;
  total_gallons: number;
  fleet_mpg: number; // 0 when total_gallons is 0
  by_jurisdiction: JurisdictionBreakdown[];
  total_net_tax: number; // sum of positive nets minus credits = balance due
}

export function quarterFromDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const m = date.getUTCMonth();
  const q = Math.floor(m / 3) + 1;
  return `${date.getUTCFullYear()}-Q${q}`;
}

export function summarizeIfta(
  trips: IftaTrip[],
  fuel: IftaFuel[],
  rates: IftaRate[],
): IftaSummary {
  const milesByJ = new Map<string, number>();
  let totalMiles = 0;
  for (const t of trips) {
    totalMiles += Number(t.total_miles) || 0;
    for (const [j, m] of Object.entries(t.miles_by_jurisdiction ?? {})) {
      const code = j.toUpperCase();
      milesByJ.set(code, (milesByJ.get(code) ?? 0) + (Number(m) || 0));
    }
  }

  const fuelByJ = new Map<string, number>();
  let totalGallons = 0;
  for (const f of fuel) {
    const code = f.jurisdiction.toUpperCase();
    fuelByJ.set(code, (fuelByJ.get(code) ?? 0) + (Number(f.gallons) || 0));
    totalGallons += Number(f.gallons) || 0;
  }

  const rateMap = new Map<string, number>();
  for (const r of rates) rateMap.set(r.jurisdiction.toUpperCase(), Number(r.rate_per_gallon) || 0);

  const mpg = totalGallons > 0 ? totalMiles / totalGallons : 0;

  const jurisdictions = new Set<string>([...milesByJ.keys(), ...fuelByJ.keys()]);
  const breakdown: JurisdictionBreakdown[] = [];
  let totalNet = 0;

  for (const j of jurisdictions) {
    const taxable_miles = milesByJ.get(j) ?? 0;
    const taxable_gallons = mpg > 0 ? taxable_miles / mpg : 0;
    const purchased_gallons = fuelByJ.get(j) ?? 0;
    const rate = rateMap.get(j) ?? 0;
    const tax_owed = taxable_gallons * rate;
    const tax_paid = purchased_gallons * rate;
    const net = tax_owed - tax_paid;
    totalNet += net;
    breakdown.push({
      jurisdiction: j,
      taxable_miles,
      taxable_gallons,
      tax_paid,
      tax_owed,
      net,
    });
  }

  breakdown.sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction));

  return {
    total_miles: totalMiles,
    total_gallons: totalGallons,
    fleet_mpg: mpg,
    by_jurisdiction: breakdown,
    total_net_tax: totalNet,
  };
}
