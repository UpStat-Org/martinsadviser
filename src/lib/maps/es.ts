import type { CountryMap } from "./types";

// 17 comunidades autónomas + 2 ciudades autónomas (Ceuta, Melilla),
// using ISO-3166-2:ES codes. Same layout discipline as US/BR: simplified
// boxes placed roughly where each community sits on the peninsula. Canarias
// gets an inset at bottom-left to mirror how Spanish maps usually show it.
export const ES_MAP: CountryMap = {
  code: "ES",
  name: "Espanha",
  flag: "🇪🇸",
  viewBox: "0 0 540 360",
  regions: {
    // ---- NORTE ----
    GA: { path: "M30,40 L110,40 L110,105 L30,105 Z",   cx: 70, cy: 72 },
    AS: { path: "M110,40 L170,40 L170,95 L110,95 Z",   cx: 140, cy: 67 },
    CB: { path: "M170,40 L220,40 L220,85 L170,85 Z",   cx: 195, cy: 62 },
    PV: { path: "M220,40 L275,40 L275,80 L220,80 Z",   cx: 247, cy: 60 },
    NC: { path: "M275,40 L320,40 L320,90 L275,90 Z",   cx: 297, cy: 65 },
    RI: { path: "M250,80 L290,80 L290,100 L250,100 Z", cx: 270, cy: 90 },
    AR: { path: "M275,90 L375,90 L375,200 L275,200 Z", cx: 325, cy: 145 },
    CT: { path: "M375,80 L470,80 L470,165 L375,165 Z", cx: 422, cy: 122 },

    // ---- CENTRO ----
    CL: { path: "M75,105 L275,105 L275,190 L75,190 Z", cx: 175, cy: 148 },
    MD: { path: "M195,190 L245,190 L245,225 L195,225 Z", cx: 220, cy: 207 },
    CM: { path: "M150,190 L335,190 L335,265 L150,265 Z", cx: 240, cy: 227 },
    EX: { path: "M75,190 L150,190 L150,280 L75,280 Z", cx: 112, cy: 235 },

    // ---- MEDITERRÁNEO ----
    VC: { path: "M335,200 L405,200 L405,290 L335,290 Z", cx: 370, cy: 245 },
    MC: { path: "M295,265 L355,265 L355,305 L295,305 Z", cx: 325, cy: 285 },

    // ---- SUR ----
    AN: { path: "M75,280 L295,280 L295,335 L75,335 Z", cx: 185, cy: 307 },

    // ---- ISLAS ----
    IB: { path: "M425,200 L490,200 L490,235 L425,235 Z", cx: 457, cy: 217 },
    CN: { path: "M30,290 L150,290 L150,345 L30,345 Z", cx: 90, cy: 317 },

    // ---- CIUDADES AUTÓNOMAS ----
    CE: { path: "M105,340 L130,340 L130,355 L105,355 Z", cx: 117, cy: 347 },
    ML: { path: "M135,340 L160,340 L160,355 L135,355 Z", cx: 147, cy: 347 },
  },
  names: {
    AN: "Andalucía", AR: "Aragón", AS: "Asturias", CB: "Cantabria",
    CL: "Castilla y León", CM: "Castilla-La Mancha", CN: "Canarias",
    CT: "Cataluña", EX: "Extremadura", GA: "Galicia", IB: "Islas Baleares",
    MC: "Murcia", MD: "Madrid", NC: "Navarra", PV: "País Vasco",
    RI: "La Rioja", VC: "Comunitat Valenciana",
    CE: "Ceuta", ML: "Melilla",
  },
};
