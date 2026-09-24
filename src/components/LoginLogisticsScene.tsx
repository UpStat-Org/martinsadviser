import { useState } from "react";
import { Pause, Play, Route } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/styles/login-scene.css";

const copy = {
  pt: { label: "UMA OPERAÇÃO CONECTADA", title: "Cada rota. Cada detalhe.", subtitle: "Tudo na mesma direção.", pause: "Pausar animação", play: "Reproduzir animação", route: "Rotas conectadas", hub: "Centro de operações" },
  en: { label: "ONE CONNECTED OPERATION", title: "Every route. Every detail.", subtitle: "Moving in one direction.", pause: "Pause animation", play: "Play animation", route: "Connected routes", hub: "Operations center" },
  es: { label: "UNA OPERACIÓN CONECTADA", title: "Cada ruta. Cada detalle.", subtitle: "Todo en la misma dirección.", pause: "Pausar animación", play: "Reproducir animación", route: "Rutas conectadas", hub: "Centro de operaciones" },
};

/** Local vector artwork: no map service, API key or WebGL context required. */
export function LoginLogisticsScene() {
  const { language } = useLanguage();
  const text = copy[language];
  const [paused, setPaused] = useState(false);

  return (
    <aside className="login-scene" data-paused={paused}>
      <div className="login-scene-heading">
        <span className="login-scene-eyebrow"><span />{text.label}</span>
        <h2>{text.title}<br /><span>{text.subtitle}</span></h2>
        <button className="login-scene-toggle" type="button" onClick={() => setPaused(!paused)} aria-label={paused ? text.play : text.pause} title={paused ? text.play : text.pause}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>
      </div>

      <div className="login-scene-art" aria-hidden="true">
        <div className="login-scene-halo" />
        <svg viewBox="0 0 720 600" className="login-scene-map">
          <defs>
            <linearGradient id="login-ground" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#203c4a" /><stop offset="1" stopColor="#0e202d" />
            </linearGradient>
            <linearGradient id="login-roof" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#d9f9f2" /><stop offset="1" stopColor="#729caa" />
            </linearGradient>
            <radialGradient id="login-beacon"><stop stopColor="#64efc4" stopOpacity=".35" /><stop offset="1" stopColor="#64efc4" stopOpacity="0" /></radialGradient>
            <pattern id="login-grid" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="matrix(1 .5 -1 .5 360 0)">
              <path d="M48 0H0V48" fill="none" stroke="#91c5d2" strokeOpacity=".1" />
            </pattern>
            <g id="login-truck">
              <ellipse cx="0" cy="10" rx="30" ry="12" fill="#000" opacity=".3" />
              <path d="M-30 -16 -8 -27 22 -12 0 -1Z" fill="#edf9fb" />
              <path d="M-30 -16 0 -1 0 17 -30 2Z" fill="#8ba9b7" />
              <path d="M0 -1 22 -12 22 6 0 17Z" fill="#c7e0e5" />
              <path d="M2 1 23 -10 36 0 15 11Z" fill="#7ef1c6" />
              <path d="M15 11 36 0 36 15 15 26Z" fill="#36b98e" />
              <path d="M2 1 15 11 15 26 2 18Z" fill="#1b826e" />
              <path d="M20 11 32 5 32 12 20 18Z" fill="#103648" />
              <ellipse cx="-21" cy="9" rx="4" ry="6" fill="#09151f" /><ellipse cx="7" cy="23" rx="4" ry="6" fill="#09151f" />
              <path d="M16 23 20 21M32 15 35 13" stroke="#e4fff1" strokeWidth="2" />
            </g>
          </defs>

          <path d="M48 260 360 104 672 260 672 290 360 446 48 290Z" fill="#07151f" />
          <path d="M48 260 360 104 672 260 360 416Z" fill="url(#login-ground)" stroke="#6caaa5" strokeOpacity=".28" />
          <path d="M48 260 360 104 672 260 360 416Z" fill="url(#login-grid)" />
          <path d="M100 260 360 130 620 260 360 390Z M230 195 490 325 M230 325 490 195" fill="none" stroke="#071a26" strokeWidth="24" strokeLinejoin="round" />
          <path d="M100 260 360 130 620 260 360 390Z M230 195 490 325 M230 325 490 195" fill="none" stroke="#77969f" strokeOpacity=".45" strokeDasharray="5 9" />
          <path className="login-route-flow" d="M100 260 360 390 620 260 360 130" fill="none" stroke="#64efc4" strokeWidth="2" strokeDasharray="6 14" />

          {/* This truck is deliberately behind the hub, so the building occludes it on this route. */}
          <g className="login-truck-two"><use href="#login-truck" /></g>

          {/* Central distribution hub, drawn in isometric perspective. */}
          <ellipse cx="360" cy="262" rx="145" ry="90" fill="url(#login-beacon)" />
          <path d="M284 225 360 187 442 228 366 267Z" fill="#06151e" opacity=".5" transform="translate(0 20)" />
          <path d="M284 174 360 136 442 177 366 216Z" fill="url(#login-roof)" />
          <path d="M284 174 366 216 366 272 284 230Z" fill="#577d8d" />
          <path d="M366 216 442 177 442 233 366 272Z" fill="#2a5163" />
          <path d="M298 192 354 221M298 202 354 231" stroke="#b7d7de" strokeOpacity=".5" strokeWidth="3" />
          {[0, 1, 2].map((i) => <path key={i} d={`M${378 + i * 21} ${226 - i * 10.5}l13 -6.5v26l-13 6.5Z`} fill="#0d2935" stroke="#6ddcbc" strokeOpacity=".6" />)}
          <path d="M307 173 356 149 412 177 363 202Z" fill="#1b4759" />
          <path d="M320 173 369 198M334 166 383 191M348 159 397 184M324 181 373 157M340 189 389 165" stroke="#91d6e2" strokeOpacity=".45" />
          <path d="M366 136V89" stroke="#75e3c4" strokeWidth="1.5" />
          <circle className="login-beacon-ring" cx="366" cy="86" r="17" fill="none" stroke="#64efc4" />
          <circle cx="366" cy="86" r="5" fill="#aaffdf" />

          {/* Satellite depots. */}
          {[{ x: 170, y: 260 }, { x: 510, y: 260 }, { x: 340, y: 340 }].map(({ x, y }) => (
            <g key={x} transform={`translate(${x} ${y})`}>
              <path d="M-23 -22 0 -34 30 -19 7 -7Z" fill="#7397a7" />
              <path d="M-23 -22 7 -7 7 17 -23 2Z" fill="#3c6375" />
              <path d="M7 -7 30 -19 30 5 7 17Z" fill="#254556" />
              <path d="M12 0 24 -6 24 6 12 12Z" fill="#70d8b7" opacity=".7" />
            </g>
          ))}
          <g className="login-truck-one"><use href="#login-truck" /></g>
          {[{ x: 100, y: 260 }, { x: 620, y: 260 }, { x: 360, y: 390 }].map(({ x, y }) => <g key={x}><ellipse cx={x} cy={y} rx="9" ry="4.5" fill="#7cf2c9" opacity=".2" /><circle cx={x} cy={y} r="3" fill="#a5ffdd" /></g>)}
          <path d="M48 304 360 460 672 304" fill="none" stroke="#64efc4" strokeOpacity=".12" />
          <path d="M100 347 360 477 620 347" fill="none" stroke="#64efc4" strokeOpacity=".06" />
        </svg>
        <div className="login-scene-tag login-scene-tag-hub"><span className="login-status-dot" />{text.hub}</div>
        <div className="login-scene-tag login-scene-tag-route"><Route size={15} />{text.route}<span className="login-signal"><i /><i /><i /></span></div>
      </div>
    </aside>
  );
}
