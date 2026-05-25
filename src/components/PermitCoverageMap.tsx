import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { COUNTRY_MAPS, SUPPORTED_COUNTRIES } from "@/lib/maps";

type CountryCode = "US" | "BR" | "ES";

type StatusVariant = "active" | "expiring" | "expired" | "empty";

function variantOf(d: { active: number; expiring: number; expired: number } | undefined): StatusVariant {
  if (!d) return "empty";
  if (d.expired > 0) return "expired";
  if (d.expiring > 0) return "expiring";
  return "active";
}

// Hardcoded palette so coverage signaling stays consistent across light/dark
// themes and white-labeled orgs that override the shadcn primary tokens.
const PALETTE: Record<StatusVariant, { fill: string; stroke: string; text: string; glow: string }> = {
  active:   { fill: "hsl(152, 60%, 40%)", stroke: "hsl(152, 70%, 28%)", text: "#fff",                    glow: "hsl(152, 65%, 44% / 0.35)" },
  expiring: { fill: "hsl(38, 92%, 50%)",  stroke: "hsl(38, 90%, 38%)",  text: "hsl(28, 90%, 14%)",      glow: "hsl(38, 95%, 56% / 0.4)" },
  expired:  { fill: "hsl(0, 72%, 51%)",   stroke: "hsl(0, 80%, 40%)",   text: "#fff",                    glow: "hsl(0, 80%, 56% / 0.35)" },
  empty:    { fill: "hsl(var(--muted))",  stroke: "hsl(var(--border))", text: "hsl(var(--foreground))",  glow: "hsl(var(--muted) / 0)" },
};

export interface PermitForMap {
  state: string | null;
  status: string;
  expiration_date: string | null;
  permit_type?: string;
  permit_number?: string | null;
  client_id?: string;
  /**
   * ISO-2 country code. Either pre-extracted as `client_country` or
   * available via the joined `clients.country` from usePermits — the
   * component accepts both shapes.
   */
  client_country?: string | null;
  clients?: { country?: string | null } | null;
}

function permitCountry(p: PermitForMap): string {
  return (p.client_country ?? p.clients?.country ?? "US") as string;
}

interface PermitCoverageMapProps {
  permits?: PermitForMap[];
  compact?: boolean;
  /** Optional initial country; otherwise picks the busiest one in `permits`. */
  defaultCountry?: CountryCode;
}

export function PermitCoverageMap({ permits, compact = false, defaultCountry }: PermitCoverageMapProps) {
  const { t } = useLanguage();

  // Auto-pick the country with the most permits when no explicit default is
  // passed. Falls back to US so the map is never empty on first paint.
  const initialCountry = useMemo<CountryCode>(() => {
    if (defaultCountry) return defaultCountry;
    if (!permits?.length) return "US";
    const tally: Record<string, number> = {};
    for (const p of permits) {
      const c = permitCountry(p);
      tally[c] = (tally[c] || 0) + 1;
    }
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
    return (SUPPORTED_COUNTRIES.includes(top as CountryCode) ? top : "US") as CountryCode;
  }, [permits, defaultCountry]);

  const [country, setCountry] = useState<CountryCode>(initialCountry);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const map = COUNTRY_MAPS[country];

  // Permits filtered to the active country. Falls back to "US" for legacy
  // rows where client_country is missing.
  const countryPermits = useMemo(() => {
    if (!permits) return [] as PermitForMap[];
    return permits.filter((p) => permitCountry(p) === country);
  }, [permits, country]);

  const stateData = useMemo(() => {
    const acc: Record<string, { active: number; expiring: number; expired: number; permits: PermitForMap[] }> = {};
    const now = new Date();
    for (const p of countryPermits) {
      if (!p.state) continue;
      const st = p.state.toUpperCase().trim();
      if (!acc[st]) acc[st] = { active: 0, expiring: 0, expired: 0, permits: [] };
      acc[st].permits.push(p);
      if (!p.expiration_date) { acc[st].active++; continue; }
      const diff = Math.ceil((new Date(p.expiration_date).getTime() - now.getTime()) / 86400000);
      if (diff < 0) acc[st].expired++;
      else if (diff <= 30) acc[st].expiring++;
      else acc[st].active++;
    }
    return acc;
  }, [countryPermits]);

  const totals = useMemo(() => {
    let active = 0, expiring = 0, expired = 0;
    for (const d of Object.values(stateData)) {
      active += d.active; expiring += d.expiring; expired += d.expired;
    }
    return { active, expiring, expired, covered: Object.keys(stateData).length };
  }, [stateData]);

  const getStatusBadge = (p: PermitForMap) => {
    if (!p.expiration_date) return <Badge variant="outline">{t("common.active")}</Badge>;
    const diff = Math.ceil((new Date(p.expiration_date).getTime() - new Date().getTime()) / 86400000);
    if (diff < 0) return <Badge className="bg-destructive text-destructive-foreground">{t("common.expired")}</Badge>;
    if (diff <= 30) return <Badge className="bg-warning text-warning-foreground">{diff}d</Badge>;
    return <Badge className="bg-success text-success-foreground">{t("common.valid")}</Badge>;
  };

  const selectedData = selectedState ? stateData[selectedState] : null;
  const hoveredData = hoveredState ? stateData[hoveredState] : null;
  const regionLabel = (code: string) => map.names[code] || code;

  // Compute Alaska/Hawaii inset bounds only when rendering the US map.
  const showInsetFrame = country === "US";

  return (
    <div className={cn(compact ? "" : "space-y-3")}>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Select value={country} onValueChange={(v) => { setCountry(v as CountryCode); setHoveredState(null); }}>
              <SelectTrigger className="h-8 w-[170px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    <span className="mr-1.5">{COUNTRY_MAPS[c].flag}</span>
                    {t(`country.${c.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden sm:flex items-center gap-3 uppercase tracking-wider text-muted-foreground ml-2">
              <span className="flex items-center gap-1.5"><Dot color={PALETTE.active.fill} /> {t("map.active")}</span>
              <span className="flex items-center gap-1.5"><Dot color={PALETTE.expiring.fill} /> {t("map.expiring")}</span>
              <span className="flex items-center gap-1.5"><Dot color={PALETTE.expired.fill} /> {t("map.expired")}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span><strong className="text-foreground tabular-nums">{totals.covered}</strong> {t("map.statesCovered")}</span>
            {totals.expired > 0 && (
              <span className="font-semibold text-destructive tabular-nums">
                {totals.expired} {t("map.expired")}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        <svg
          viewBox={map.viewBox}
          className={cn("w-full", compact ? "h-44" : "h-auto max-h-[460px]")}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={`${map.name} coverage map`}
        >
          <defs>
            <linearGradient id="state-shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.22" />
              <stop offset="60%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>

          {showInsetFrame && (
            <rect
              x={108} y={490} width={195} height={62} rx={6}
              fill="hsl(var(--muted) / 0.35)"
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
              strokeWidth="0.8"
            />
          )}

          {Object.entries(map.regions).map(([code, { path }]) => {
            const variant = variantOf(stateData[code]);
            const palette = PALETTE[variant];
            const isHovered = hoveredState === code;
            const isSelected = selectedState === code;
            const hasData = variant !== "empty";

            return (
              <g
                key={code}
                onMouseEnter={() => setHoveredState(code)}
                onMouseLeave={() => setHoveredState(null)}
                onClick={() => setSelectedState(code)}
                className="cursor-pointer"
                style={{
                  transition: "filter 160ms ease, opacity 160ms ease",
                  filter: isHovered && hasData ? `drop-shadow(0 4px 10px ${palette.glow})` : undefined,
                }}
              >
                <path
                  d={path}
                  fill={palette.fill}
                  stroke={isHovered || isSelected ? palette.stroke : "hsl(var(--background))"}
                  strokeWidth={isHovered || isSelected ? 1.5 : 0.85}
                  strokeLinejoin="round"
                  opacity={isHovered ? 1 : hasData ? 0.96 : 0.55}
                />
                {hasData && (
                  <path d={path} fill="url(#state-shine)" pointerEvents="none" />
                )}
              </g>
            );
          })}

          {Object.entries(map.regions).map(([code, { cx, cy }]) => {
            const variant = variantOf(stateData[code]);
            const palette = PALETTE[variant];
            const hasData = variant !== "empty";
            // Spain has tiny city tiles (CE/ML); shrink labels there.
            const fontSize = code === "CE" || code === "ML" || code === "DF" || code === "RI" ? 8 : 10;
            return (
              <text
                key={`label-${code}`}
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fontWeight={700}
                fill={palette.text}
                opacity={hasData ? 1 : 0.55}
                letterSpacing="0.04em"
                className="pointer-events-none select-none"
                style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}
              >
                {code}
              </text>
            );
          })}
        </svg>

        {hoveredState && (
          <div className="absolute top-2 right-2 bg-popover/95 backdrop-blur-sm border border-border/60 rounded-lg shadow-lg p-3 min-w-[180px] pointer-events-none">
            <div className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
              {hoveredState}
            </div>
            <div className="text-sm font-semibold mt-0.5">{regionLabel(hoveredState)}</div>
            {hoveredData ? (
              <div className="mt-2 flex items-center gap-3 text-xs">
                {hoveredData.active > 0 && (
                  <span className="flex items-center gap-1"><Dot color={PALETTE.active.fill} /> {hoveredData.active}</span>
                )}
                {hoveredData.expiring > 0 && (
                  <span className="flex items-center gap-1"><Dot color={PALETTE.expiring.fill} /> {hoveredData.expiring}</span>
                )}
                {hoveredData.expired > 0 && (
                  <span className="flex items-center gap-1"><Dot color={PALETTE.expired.fill} /> {hoveredData.expired}</span>
                )}
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">{t("map.noCoverage")}</div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!selectedState} onOpenChange={(o) => !o && setSelectedState(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold tracking-wider text-white shadow"
                style={{ backgroundColor: selectedState ? PALETTE[variantOf(stateData[selectedState])].fill : undefined }}
              >
                {selectedState}
              </span>
              <span>{selectedState && regionLabel(selectedState)}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat tone="success" label={t("map.active")} value={selectedData.active} />
                <Stat tone="warning" label={t("map.expiring")} value={selectedData.expiring} />
                <Stat tone="destructive" label={t("map.expired")} value={selectedData.expired} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("nav.permits")} ({selectedData.permits.length})</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {selectedData.permits.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                      <div className="min-w-0">
                        <span className="font-medium">{p.permit_type || "—"}</span>
                        {p.permit_number && <span className="text-xs text-muted-foreground ml-2">#{p.permit_number}</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.expiration_date && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(p.expiration_date), "dd/MM/yyyy")}
                          </span>
                        )}
                        {getStatusBadge(p)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">{t("map.noCoverage")}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />;
}

function Stat({ tone, label, value }: { tone: "success" | "warning" | "destructive"; label: string; value: number }) {
  const bg = tone === "success" ? "bg-success/10" : tone === "warning" ? "bg-warning/10" : "bg-destructive/10";
  const fg = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-destructive";
  return (
    <div className={cn("p-3 rounded-lg border", bg)}>
      <p className={cn("text-2xl font-bold tabular-nums", fg)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
