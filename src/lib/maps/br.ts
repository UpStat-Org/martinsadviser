import type { CountryMap } from "./types";

// 27 UFs (26 estados + DF). Same drawing approach as US: rounded boxes at
// approximate geographic positions. Not survey-accurate, but reads as Brazil
// at a glance. Iconic exterior outline (Norte huge, NE bumping out east,
// south thinning down) was the main thing to preserve.
export const BR_MAP: CountryMap = {
  code: "BR",
  name: "Brasil",
  flag: "🇧🇷",
  viewBox: "0 0 500 560",
  regions: {
    // ---- NORTE ----
    RR: { path: "M170,15 L240,15 L240,90 L170,90 Z",      cx: 205, cy: 52 },
    AP: { path: "M335,30 L395,30 L395,90 L335,90 Z",       cx: 365, cy: 60 },
    AM: { path: "M40,90 L255,90 L255,205 L40,205 Z",       cx: 145, cy: 148 },
    PA: { path: "M255,90 L420,90 L420,225 L255,225 Z",     cx: 335, cy: 158 },
    AC: { path: "M10,205 L115,205 L115,260 L10,260 Z",     cx: 62, cy: 232 },
    RO: { path: "M115,205 L195,205 L195,285 L115,285 Z",   cx: 155, cy: 245 },
    TO: { path: "M260,225 L325,225 L325,330 L260,330 Z",   cx: 292, cy: 278 },

    // ---- NORDESTE ----
    MA: { path: "M325,90 L420,90 L420,180 L370,200 L325,200 Z", cx: 365, cy: 138 },
    PI: { path: "M370,200 L425,200 L425,300 L370,300 Z",    cx: 395, cy: 245 },
    CE: { path: "M420,135 L470,135 L470,200 L420,200 Z",    cx: 445, cy: 168 },
    RN: { path: "M450,200 L490,200 L490,222 L450,222 Z",    cx: 470, cy: 211 },
    PB: { path: "M445,222 L490,222 L490,243 L445,243 Z",    cx: 467, cy: 232 },
    PE: { path: "M395,243 L490,243 L490,272 L395,272 Z",    cx: 442, cy: 257 },
    AL: { path: "M440,272 L478,272 L478,292 L440,292 Z",    cx: 459, cy: 282 },
    SE: { path: "M425,292 L465,292 L465,310 L425,310 Z",    cx: 445, cy: 301 },
    BA: { path: "M325,272 L440,272 L440,400 L325,400 Z",    cx: 380, cy: 335 },

    // ---- CENTRO-OESTE ----
    MT: { path: "M115,285 L260,285 L260,395 L115,395 Z",    cx: 187, cy: 340 },
    MS: { path: "M115,395 L260,395 L260,475 L115,475 Z",    cx: 187, cy: 435 },
    GO: { path: "M225,330 L325,330 L325,420 L225,420 Z",    cx: 275, cy: 375 },
    DF: { path: "M278,380 L302,380 L302,400 L278,400 Z",    cx: 290, cy: 390 },

    // ---- SUDESTE ----
    MG: { path: "M225,420 L370,420 L370,470 L225,470 Z",    cx: 295, cy: 445 },
    ES: { path: "M370,400 L420,400 L420,460 L370,460 Z",    cx: 395, cy: 430 },
    RJ: { path: "M310,470 L380,470 L380,500 L310,500 Z",    cx: 345, cy: 485 },
    SP: { path: "M205,470 L310,470 L310,520 L205,520 Z",    cx: 257, cy: 495 },

    // ---- SUL ----
    PR: { path: "M170,520 L290,520 L290,545 L170,545 Z",    cx: 230, cy: 532 },
    SC: { path: "M165,540 L275,540 L275,555 L165,555 Z",    cx: 220, cy: 547 },
    RS: { path: "M125,545 L260,545 L260,558 L125,558 Z",    cx: 192, cy: 552 },
  },
  names: {
    AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
    CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
    MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
    PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
    RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
    RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
    SE: "Sergipe", TO: "Tocantins",
  },
};
