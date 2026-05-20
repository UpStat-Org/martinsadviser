import type { CountryMap } from "./types";

// 50 US states positioned in a 960×600-ish viewBox. The visually iconic
// states (TX, CA, FL, MI, LA, OK) carry hand-drawn paths so the silhouette
// reads as the US; the rest are rounded rectangles placed at their real
// geographic positions.
export const US_MAP: CountryMap = {
  code: "US",
  name: "Estados Unidos",
  flag: "🇺🇸",
  viewBox: "100 60 760 510",
  regions: {
    // ---- WEST ----
    WA: { path: "M130,75 L220,75 L220,140 L130,140 Z", cx: 175, cy: 107 },
    OR: { path: "M120,140 L215,140 L215,210 L120,210 Z", cx: 167, cy: 175 },
    CA: { path: "M120,210 L175,210 L178,290 L168,360 L150,420 L130,420 L120,370 L120,290 Z", cx: 147, cy: 320 },
    NV: { path: "M165,220 L225,220 L218,370 L168,370 Z", cx: 195, cy: 300 },
    ID: { path: "M218,140 L267,140 L260,200 L255,260 L218,260 Z", cx: 240, cy: 210 },
    MT: { path: "M245,90 L380,90 L380,175 L245,175 Z", cx: 312, cy: 132 },
    WY: { path: "M260,175 L365,175 L365,250 L260,250 Z", cx: 312, cy: 212 },
    UT: { path: "M220,250 L292,250 L292,355 L220,355 Z", cx: 256, cy: 302 },
    CO: { path: "M292,250 L380,250 L380,345 L292,345 Z", cx: 336, cy: 297 },
    AZ: { path: "M195,360 L265,360 L265,445 L210,445 L205,400 Z", cx: 232, cy: 405 },
    NM: { path: "M265,345 L350,345 L350,450 L265,450 Z", cx: 307, cy: 400 },

    // ---- PLAINS ----
    ND: { path: "M380,90 L475,90 L475,165 L380,165 Z", cx: 427, cy: 127 },
    SD: { path: "M380,165 L475,165 L475,235 L380,235 Z", cx: 427, cy: 200 },
    NE: { path: "M370,235 L490,235 L490,300 L370,300 Z", cx: 430, cy: 268 },
    KS: { path: "M380,300 L500,300 L500,365 L380,365 Z", cx: 440, cy: 332 },
    OK: { path: "M330,365 L380,365 L380,380 L510,380 L510,415 L380,415 L380,395 L330,395 Z", cx: 445, cy: 397 },
    TX: { path: "M400,415 L440,415 L440,425 L510,425 L518,455 L502,495 L470,520 L420,525 L385,510 L355,470 L350,440 L380,425 L400,425 Z", cx: 435, cy: 465 },

    // ---- MIDWEST ----
    MN: { path: "M475,115 L555,115 L555,220 L475,220 Z", cx: 515, cy: 168 },
    IA: { path: "M490,220 L570,220 L570,285 L490,285 Z", cx: 530, cy: 252 },
    MO: { path: "M500,285 L578,285 L582,380 L500,380 Z", cx: 540, cy: 332 },
    AR: { path: "M545,380 L605,380 L605,440 L545,440 Z", cx: 575, cy: 410 },
    LA: { path: "M540,440 L607,440 L607,475 L595,495 L575,492 L552,498 L540,475 Z", cx: 573, cy: 465 },
    WI: { path: "M540,150 L595,150 L595,230 L540,230 Z", cx: 567, cy: 190 },
    IL: { path: "M570,230 L612,230 L612,360 L570,360 Z", cx: 591, cy: 295 },
    IN: { path: "M612,250 L648,250 L648,350 L612,350 Z", cx: 630, cy: 300 },
    MI: { path: "M535,135 L605,135 L605,160 L545,160 Z M585,170 L645,170 L650,250 L625,260 L605,245 L595,210 L585,190 Z", cx: 617, cy: 215 },
    OH: { path: "M645,245 L705,245 L705,325 L645,325 Z", cx: 675, cy: 285 },

    // ---- SOUTH ----
    MS: { path: "M572,395 L612,395 L612,465 L572,465 Z", cx: 592, cy: 430 },
    AL: { path: "M612,395 L635,395 L635,440 L630,460 L615,468 L612,445 Z", cx: 623, cy: 425 },
    TN: { path: "M572,355 L700,355 L700,390 L572,390 Z", cx: 636, cy: 372 },
    KY: { path: "M600,320 L705,320 L705,360 L605,365 L600,345 Z", cx: 650, cy: 340 },
    GA: { path: "M635,395 L685,395 L693,455 L675,460 L640,455 Z", cx: 663, cy: 425 },
    FL: { path: "M625,455 L693,455 L693,470 L685,485 L692,510 L678,532 L658,535 L644,520 L640,490 L625,478 Z", cx: 670, cy: 495 },
    SC: { path: "M672,378 L735,378 L735,415 L685,420 Z", cx: 700, cy: 398 },
    NC: { path: "M652,348 L760,348 L758,380 L672,385 Z", cx: 705, cy: 365 },
    VA: { path: "M672,300 L760,300 L760,345 L672,345 Z", cx: 715, cy: 322 },
    WV: { path: "M680,275 L724,275 L724,335 L680,335 Z", cx: 702, cy: 305 },

    // ---- MID-ATLANTIC ----
    PA: { path: "M690,220 L770,220 L770,272 L690,272 Z", cx: 728, cy: 246 },
    MD: { path: "M710,275 L762,275 L762,300 L710,300 Z", cx: 736, cy: 287 },
    DE: { path: "M748,278 L763,278 L763,308 L748,308 Z", cx: 755, cy: 293 },
    NJ: { path: "M758,235 L778,235 L778,290 L758,290 Z", cx: 768, cy: 262 },

    // ---- NORTHEAST ----
    NY: { path: "M710,160 L790,160 L790,235 L710,235 Z", cx: 750, cy: 197 },
    VT: { path: "M780,130 L800,130 L800,190 L780,190 Z", cx: 790, cy: 160 },
    NH: { path: "M797,125 L815,125 L815,195 L797,195 Z", cx: 806, cy: 160 },
    ME: { path: "M800,90 L840,90 L840,170 L820,180 L800,160 Z", cx: 820, cy: 135 },
    MA: { path: "M785,195 L832,195 L832,215 L785,215 Z", cx: 808, cy: 205 },
    CT: { path: "M775,215 L808,215 L808,235 L775,235 Z", cx: 791, cy: 225 },
    RI: { path: "M810,215 L824,215 L824,233 L810,233 Z", cx: 817, cy: 224 },

    // ---- OUTLIERS (inset) ----
    AK: { path: "M118,500 L195,500 L195,548 L118,548 Z", cx: 156, cy: 524 },
    HI: { path: "M225,520 L295,520 L295,548 L225,548 Z", cx: 260, cy: 534 },
  },
  names: {
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
  },
};
