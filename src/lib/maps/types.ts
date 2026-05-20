// Shared shape for all country-level cartographic data. Each country file
// exports the same structure so PermitCoverageMap can swap between them
// without branching on the country code.

export interface RegionShape {
  /** SVG path data inside the country's viewBox. */
  path: string;
  /** Label centroid (in viewBox coordinates). */
  cx: number;
  cy: number;
}

export interface CountryMap {
  /** ISO-3166-1 alpha-2. */
  code: "US" | "BR" | "ES";
  /** Human label shown in the swapper. */
  name: string;
  /** Emoji flag — cheap, no asset, works inline. */
  flag: string;
  /** SVG viewBox the paths use ("minX minY width height"). */
  viewBox: string;
  /** Map of region code → outline + label position. */
  regions: Record<string, RegionShape>;
  /** Map of region code → full readable name (for tooltips/modals). */
  names: Record<string, string>;
}
