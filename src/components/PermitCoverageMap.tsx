import { useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const US_STATES: Record<string, { path: string; cx: number; cy: number }> = {
  AL: { path: "M628,396 L628,448 L612,462 L606,450 L604,396Z", cx: 616, cy: 428 },
  AK: { path: "M161,485 L195,485 L195,520 L161,520Z", cx: 178, cy: 502 },
  AZ: { path: "M205,380 L265,380 L265,445 L205,445Z", cx: 235, cy: 412 },
  AR: { path: "M545,390 L600,390 L600,435 L545,435Z", cx: 572, cy: 412 },
  CA: { path: "M120,270 L175,270 L175,420 L120,420Z", cx: 147, cy: 345 },
  CO: { path: "M280,290 L365,290 L365,345 L280,345Z", cx: 322, cy: 317 },
  CT: { path: "M780,210 L805,210 L805,235 L780,235Z", cx: 792, cy: 222 },
  DE: { path: "M745,280 L762,280 L762,305 L745,305Z", cx: 753, cy: 292 },
  FL: { path: "M625,460 L700,460 L690,530 L650,530Z", cx: 665, cy: 490 },
  GA: { path: "M640,390 L690,390 L690,455 L640,455Z", cx: 665, cy: 422 },
  HI: { path: "M260,490 L300,490 L300,520 L260,520Z", cx: 280, cy: 505 },
  ID: { path: "M210,150 L260,150 L260,260 L210,260Z", cx: 235, cy: 205 },
  IL: { path: "M570,260 L610,260 L610,360 L570,360Z", cx: 590, cy: 310 },
  IN: { path: "M610,260 L645,260 L645,350 L610,350Z", cx: 627, cy: 305 },
  IA: { path: "M490,230 L565,230 L565,285 L490,285Z", cx: 527, cy: 257 },
  KS: { path: "M390,310 L500,310 L500,365 L390,365Z", cx: 445, cy: 337 },
  KY: { path: "M600,320 L700,320 L700,365 L600,365Z", cx: 650, cy: 342 },
  LA: { path: "M545,440 L605,440 L605,490 L545,490Z", cx: 575, cy: 465 },
  ME: { path: "M800,100 L835,100 L835,175 L800,175Z", cx: 817, cy: 137 },
  MD: { path: "M710,275 L760,275 L760,300 L710,300Z", cx: 735, cy: 287 },
  MA: { path: "M785,195 L825,195 L825,215 L785,215Z", cx: 805, cy: 205 },
  MI: { path: "M580,165 L645,165 L645,255 L580,255Z", cx: 612, cy: 210 },
  MN: { path: "M470,120 L545,120 L545,220 L470,220Z", cx: 507, cy: 170 },
  MS: { path: "M575,395 L612,395 L612,465 L575,465Z", cx: 593, cy: 430 },
  MO: { path: "M500,300 L575,300 L575,380 L500,380Z", cx: 537, cy: 340 },
  MT: { path: "M245,100 L380,100 L380,175 L245,175Z", cx: 312, cy: 137 },
  NE: { path: "M370,250 L490,250 L490,305 L370,305Z", cx: 430, cy: 277 },
  NV: { path: "M165,230 L225,230 L225,370 L165,370Z", cx: 195, cy: 300 },
  NH: { path: "M795,130 L815,130 L815,195 L795,195Z", cx: 805, cy: 162 },
  NJ: { path: "M755,235 L775,235 L775,290 L755,290Z", cx: 765, cy: 262 },
  NM: { path: "M255,370 L340,370 L340,450 L255,450Z", cx: 297, cy: 410 },
  NY: { path: "M710,160 L790,160 L790,235 L710,235Z", cx: 750, cy: 197 },
  NC: { path: "M650,345 L760,345 L760,385 L650,385Z", cx: 705, cy: 365 },
  ND: { path: "M380,110 L475,110 L475,170 L380,170Z", cx: 427, cy: 140 },
  OH: { path: "M640,245 L700,245 L700,325 L640,325Z", cx: 670, cy: 285 },
  OK: { path: "M380,365 L510,365 L510,410 L380,410Z", cx: 445, cy: 387 },
  OR: { path: "M120,130 L215,130 L215,210 L120,210Z", cx: 167, cy: 170 },
  PA: { path: "M690,220 L765,220 L765,270 L690,270Z", cx: 727, cy: 245 },
  RI: { path: "M800,215 L815,215 L815,232 L800,232Z", cx: 807, cy: 223 },
  SC: { path: "M670,375 L730,375 L730,415 L670,415Z", cx: 700, cy: 395 },
  SD: { path: "M380,170 L475,170 L475,240 L380,240Z", cx: 427, cy: 205 },
  TN: { path: "M565,355 L700,355 L700,390 L565,390Z", cx: 632, cy: 372 },
  TX: { path: "M340,400 L530,400 L530,520 L340,520Z", cx: 435, cy: 460 },
  UT: { path: "M225,245 L290,245 L290,355 L225,355Z", cx: 257, cy: 300 },
  VT: { path: "M780,130 L800,130 L800,190 L780,190Z", cx: 790, cy: 160 },
  VA: { path: "M670,300 L760,300 L760,345 L670,345Z", cx: 715, cy: 322 },
  WA: { path: "M130,75 L220,75 L220,140 L130,140Z", cx: 175, cy: 107 },
  WV: { path: "M680,280 L720,280 L720,335 L680,335Z", cx: 700, cy: 307 },
  WI: { path: "M530,140 L590,140 L590,240 L530,240Z", cx: 560, cy: 190 },
  WY: { path: "M265,185 L365,185 L365,255 L265,255Z", cx: 315, cy: 220 },
};

export interface PermitForMap {
  state: string | null;
  status: string;
  expiration_date: string | null;
  permit_type?: string;
  permit_number?: string | null;
  client_id?: string;
}

interface PermitCoverageMapProps {
  permits?: PermitForMap[];
  compact?: boolean;
}

export function PermitCoverageMap({ permits, compact = false }: PermitCoverageMapProps) {
  const { t } = useLanguage();
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const stateData = useMemo(() => {
    const map: Record<string, { active: number; expiring: number; expired: number; permits: PermitForMap[] }> = {};
    if (!permits) return map;
    const now = new Date();
    for (const p of permits) {
      if (!p.state) continue;
      const st = p.state.toUpperCase().trim();
      if (!map[st]) map[st] = { active: 0, expiring: 0, expired: 0, permits: [] };
      map[st].permits.push(p);
      if (!p.expiration_date) { map[st].active++; continue; }
      const diff = Math.ceil((new Date(p.expiration_date).getTime() - now.getTime()) / 86400000);
      if (diff < 0) map[st].expired++;
      else if (diff <= 30) map[st].expiring++;
      else map[st].active++;
    }
    return map;
  }, [permits]);

  const getColor = (st: string) => {
    const d = stateData[st];
    if (!d) return "hsl(var(--muted))";
    if (d.expired > 0) return "hsl(0, 72%, 51%)";
    if (d.expiring > 0) return "hsl(38, 92%, 50%)";
    return "hsl(152, 60%, 40%)";
  };

  const getStatusBadge = (p: PermitForMap) => {
    if (!p.expiration_date) return <Badge variant="outline">{t("common.active")}</Badge>;
    const diff = Math.ceil((new Date(p.expiration_date).getTime() - new Date().getTime()) / 86400000);
    if (diff < 0) return <Badge className="bg-destructive text-destructive-foreground">{t("common.expired")}</Badge>;
    if (diff <= 30) return <Badge className="bg-warning text-warning-foreground">{diff}d</Badge>;
    return <Badge className="bg-success text-success-foreground">{t("common.valid")}</Badge>;
  };

  const coveredCount = Object.keys(stateData).length;
  const selectedData = selectedState ? stateData[selectedState] : null;

  return (
    <div className={compact ? "" : "space-y-2"}>
      {!compact && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t("map.title")}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-success inline-block" /> {t("map.active")}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-warning inline-block" /> {t("map.expiring")}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive inline-block" /> {t("map.expired")}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-muted inline-block" /> {t("map.noCoverage")}</span>
          </div>
        </div>
      )}
      <svg viewBox="100 60 760 480" className={`w-full ${compact ? "h-40" : "h-64"}`} xmlns="http://www.w3.org/2000/svg">
        {Object.entries(US_STATES).map(([abbr, { path }]) => (
          <Tooltip key={abbr}>
            <TooltipTrigger asChild>
              <path
                d={path}
                fill={getColor(abbr)}
                stroke="hsl(var(--border))"
                strokeWidth="1"
                opacity={hoveredState === abbr ? 0.8 : 1}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredState(abbr)}
                onMouseLeave={() => setHoveredState(null)}
                onClick={() => setSelectedState(abbr)}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{STATE_NAMES[abbr] || abbr}</p>
              {stateData[abbr] ? (
                <p className="text-xs">{stateData[abbr].permits.length} permit(s)</p>
              ) : <p className="text-xs">{t("map.noCoverage")}</p>}
            </TooltipContent>
          </Tooltip>
        ))}
        {Object.entries(US_STATES).map(([abbr, { cx, cy }]) => (
          <text key={`label-${abbr}`} x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="8" fill="hsl(var(--foreground))" className="pointer-events-none font-medium" opacity={0.7}>
            {abbr}
          </text>
        ))}
      </svg>
      {!compact && <p className="text-xs text-muted-foreground text-center">{coveredCount} {t("map.statesCovered")}</p>}

      {/* State Detail Modal */}
      <Dialog open={!!selectedState} onOpenChange={(o) => !o && setSelectedState(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm inline-block" style={{ backgroundColor: selectedState ? getColor(selectedState) : undefined }} />
              {selectedState && (STATE_NAMES[selectedState] || selectedState)} ({selectedState})
            </DialogTitle>
          </DialogHeader>
          {selectedData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-success/10 border">
                  <p className="text-2xl font-bold text-success">{selectedData.active}</p>
                  <p className="text-xs text-muted-foreground">{t("map.active")}</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/10 border">
                  <p className="text-2xl font-bold text-warning">{selectedData.expiring}</p>
                  <p className="text-xs text-muted-foreground">{t("map.expiring")}</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10 border">
                  <p className="text-2xl font-bold text-destructive">{selectedData.expired}</p>
                  <p className="text-xs text-muted-foreground">{t("map.expired")}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("nav.permits")} ({selectedData.permits.length})</p>
                {selectedData.permits.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                    <div>
                      <span className="font-medium">{p.permit_type || "—"}</span>
                      {p.permit_number && <span className="text-xs text-muted-foreground ml-2">#{p.permit_number}</span>}
                    </div>
                    <div className="flex items-center gap-2">
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
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">{t("map.noCoverage")}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
