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
