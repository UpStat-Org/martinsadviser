// IRS Form 2290 HVUT — annual tax per heavy vehicle.
//
// Tax year runs July 1 → June 30. Vehicles in continuous service must file
// by Aug 31 (for July first-use). New or returning vehicles file by the last
// day of the month following first use.
//
// Tax brackets (IRS 2024, unchanged since 2022):
//   - < 55,000 lbs               → exempt (not subject to HVUT)
//   - 55,000 lbs                 → $100
//   - 55,001 – 75,000 lbs        → $100 + $22 per 1,000 lbs over 55,000
//   - > 75,000 lbs               → $550 (cap)
//
// Suspended vehicles (≤ 5,000 mi/yr public-road use, or 7,500 mi/yr for
// agricultural) file Schedule 1 but pay $0.

export function computeHvutTax(taxableGrossWeightLbs: number | null, suspended: boolean): number {
  if (suspended) return 0;
  if (!taxableGrossWeightLbs || taxableGrossWeightLbs < 55_000) return 0;
  if (taxableGrossWeightLbs > 75_000) return 550;
  if (taxableGrossWeightLbs === 55_000) return 100;
  // $22 per 1,000 lbs over 55,000, partial thousands round up to the next K.
  const over55K = taxableGrossWeightLbs - 55_000;
  const thousandsOver = Math.ceil(over55K / 1_000);
  return 100 + 22 * thousandsOver;
}

export function currentTaxYear(now: Date = new Date()): number {
  // Tax year N covers July N → June N+1.
  const month = now.getUTCMonth(); // 0-indexed
  const year = now.getUTCFullYear();
  return month >= 6 ? year : year - 1;
}

export function filingDeadlineFor(firstUsedMonth: string): string {
  // 'YYYY-MM' → last day of the following month, ISO.
  const [yStr, mStr] = firstUsedMonth.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10); // 1-12
  // last day of (month + 1)
  const nextMonth = month + 1;
  const lastDay = new Date(Date.UTC(year, nextMonth, 0)).getUTCDate();
  const ny = nextMonth > 12 ? year + 1 : year;
  const nm = nextMonth > 12 ? 1 : nextMonth;
  return `${ny}-${String(nm).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
