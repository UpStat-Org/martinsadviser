import { US_MAP } from "./us";
import { BR_MAP } from "./br";
import { ES_MAP } from "./es";
import type { CountryMap } from "./types";

export type { CountryMap, RegionShape } from "./types";

export const COUNTRY_MAPS: Record<"US" | "BR" | "ES", CountryMap> = {
  US: US_MAP,
  BR: BR_MAP,
  ES: ES_MAP,
};

export const SUPPORTED_COUNTRIES: Array<"US" | "BR" | "ES"> = ["US", "BR", "ES"];

export type MapCountryCode = typeof SUPPORTED_COUNTRIES[number];

/** Converts a value saved by older imports or forms into one supported map country. */
export function normalizeMapCountry(value: string | null | undefined): MapCountryCode | null {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

  if (["US", "USA", "UNITED STATES", "ESTADOS UNIDOS"].includes(normalized)) return "US";
  if (["BR", "BRAZIL", "BRASIL"].includes(normalized)) return "BR";
  if (["ES", "ESPANHA", "SPAIN", "ESPANA"].includes(normalized)) return "ES";
  return null;
}

/**
 * Accepts the short code shown on the map, the ISO-3166-2 form (BR-SP,
 * ES-MD), and the full region name. This keeps old spreadsheet imports and
 * manual entries visible without changing the value the user typed.
 */
export function normalizeMapRegion(country: MapCountryCode, value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const map = COUNTRY_MAPS[country];
  const clean = (text: string) => text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  const raw = clean(value);
  const codes = new Set(Object.keys(map.regions));

  if (codes.has(raw)) return raw;

  // "BR-SP", "ES-MD", "São Paulo (SP)" and "Madrid / MD" all expose
  // the desired two-letter code as a token.
  for (const token of raw.split(/[^A-Z0-9]+/)) {
    if (codes.has(token)) return token;
  }

  for (const [code, name] of Object.entries(map.names)) {
    if (clean(name) === raw) return code;
  }

  return null;
}
