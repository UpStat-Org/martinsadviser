// ============================================================================
// Color helpers
//
// The shadcn/Tailwind theme stores colors as bare HSL triplets in CSS
// variables (e.g. "234 75% 58%"), consumed via hsl(var(--primary)). To allow
// orgs to pick a custom brand color via a <input type="color"> (which emits
// hex), we convert hex → that triplet format.
// ============================================================================

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export interface HslTriplet {
  h: number;
  s: number;
  l: number;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

/** Parses a hex color into an HSL triplet (h: 0-360, s/l: 0-100). */
export function hexToHsl(hex: string): HslTriplet | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      case b: hue = (r - g) / d + 4; break;
    }
    hue *= 60;
  }
  return {
    h: Math.round(hue),
    s: Math.round(clamp01(s) * 100),
    l: Math.round(clamp01(l) * 100),
  };
}

function formatTriplet(hsl: HslTriplet): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Converts "#rrggbb" (or "#rgb") into the "H S% L%" shape that shadcn CSS
 * variables expect. Returns null for malformed input so callers can fall
 * back to the default theme instead of writing a broken variable.
 */
export function hexToHslTriplet(hex: string): string | null {
  const hsl = hexToHsl(hex);
  return hsl ? formatTriplet(hsl) : null;
}

/** Perceived luminance per WCAG, used to pick black/white foregrounds. */
function luminance(rgb: { r: number; g: number; b: number }): number {
  const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
}

/** Picks the readable foreground (dark or light) for a given hex bg. */
export function readableForegroundTriplet(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "0 0% 100%"; // safe fallback: white
  return luminance(rgb) > 0.5 ? "0 0% 12%" : "0 0% 100%";
}

/** Returns true if the string looks like a valid 3- or 6-digit hex color. */
export function isHexColor(value: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/**
 * Full list of shadcn CSS variables we touch when an org brands the app.
 * Tracked here so cleanup can blanket-clear them — `removeProperty` on a
 * variable that was never set is a no-op, so listing extras is safe.
 */
const THEMED_VARS = [
  "--primary",
  "--primary-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--ring",
  "--accent",
  "--accent-foreground",
] as const;

export interface BrandingColors {
  primary: string | null;
  accent: string | null;
}

/**
 * Repaints the shadcn theme to match an org's branding colors. The primary
 * hex drives strong surfaces (buttons, focus rings, sidebar active state)
 * and a desaturated lightness-shifted variant drives the sidebar's hover
 * accent — keeping the sidebar coherent with the brand without going full
 * saturation. The accent hex replaces the amber highlight (used in some
 * hover/badge surfaces); we also compute a foreground that meets contrast.
 *
 * Pass `{ primary: null, accent: null }` (or call with no override) to
 * reset to the stylesheet defaults.
 */
export function applyBrandingColors(colors: BrandingColors) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Always clear first so partial updates don't leak old values when a key
  // is toggled from "set" back to null.
  for (const v of THEMED_VARS) root.style.removeProperty(v);

  if (colors.primary) {
    const hsl = hexToHsl(colors.primary);
    if (hsl) {
      const primaryTriplet = formatTriplet(hsl);
      root.style.setProperty("--primary", primaryTriplet);
      root.style.setProperty("--sidebar-primary", primaryTriplet);
      root.style.setProperty("--ring", primaryTriplet);
      root.style.setProperty("--primary-foreground", readableForegroundTriplet(colors.primary));
      root.style.setProperty("--sidebar-primary-foreground", readableForegroundTriplet(colors.primary));

      // Sidebar accent (hover bg) = very light tint of the brand hue.
      // Sidebar accent foreground = darker, saturated version for legibility.
      const tintL = Math.max(88, Math.min(96, hsl.l + 32));
      const onTintL = Math.max(20, Math.min(32, hsl.l - 24));
      const tintS = Math.max(20, Math.min(hsl.s, 60));
      root.style.setProperty("--sidebar-accent", `${hsl.h} ${tintS}% ${tintL}%`);
      root.style.setProperty("--sidebar-accent-foreground", `${hsl.h} ${Math.min(70, hsl.s + 10)}% ${onTintL}%`);
    }
  }

  if (colors.accent) {
    const triplet = hexToHslTriplet(colors.accent);
    if (triplet) {
      root.style.setProperty("--accent", triplet);
      root.style.setProperty("--accent-foreground", readableForegroundTriplet(colors.accent));
    }
  }
}
