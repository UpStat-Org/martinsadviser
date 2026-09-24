import { Building2, CircleCheck, Workflow } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/styles/auth-scenes.css";

const copy = {
  pt: { label: "NOVA OPERAÇÃO", title: "Sua empresa ganha forma.", subtitle: "Tudo começa conectado.", status: "Configuração em andamento", ready: "Base operacional pronta" },
  en: { label: "NEW OPERATION", title: "Your company takes shape.", subtitle: "Everything starts connected.", status: "Setup in progress", ready: "Operations base ready" },
  es: { label: "NUEVA OPERACIÓN", title: "Tu empresa toma forma.", subtitle: "Todo empieza conectado.", status: "Configuración en curso", ready: "Base operativa lista" },
};

export function StartOrgScene() {
  const { language } = useLanguage();
  const text = copy[language];

  return (
    <aside className="auth-scene org-scene">
      <div className="auth-scene-heading">
        <span className="auth-scene-eyebrow"><span />{text.label}</span>
        <h2>{text.title}</h2>
        <p>{text.subtitle}</p>
      </div>
      <div className="org-scene-art" aria-hidden="true">
        <svg viewBox="0 0 640 500" className="org-blueprint">
          <defs><linearGradient id="org-main" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#685ff5" /><stop offset="1" stopColor="#54d8d0" /></linearGradient></defs>
          <path d="M110 337 320 216 530 337 320 458Z" fill="#142d42" stroke="#79c7d4" strokeOpacity=".25" />
          <path d="M110 337 320 216 530 337 320 458Z M215 277v120M425 277v120M215 337h210" fill="none" stroke="#9bd7df" strokeOpacity=".13" />
          <path className="org-connector org-connector-one" d="M177 270 320 188 463 270" fill="none" stroke="#63e2d0" strokeWidth="2" strokeDasharray="5 10" />
          <path className="org-connector org-connector-two" d="M177 356 320 438 463 356" fill="none" stroke="#8f88ff" strokeWidth="2" strokeDasharray="5 10" />
          <g className="org-building org-building-main">
            <path d="M254 238 320 200 389 240 322 280Z" fill="url(#org-main)" />
            <path d="M254 238 322 280 322 375 254 332Z" fill="#344f75" />
            <path d="M322 280 389 240 389 335 322 375Z" fill="#203a5c" />
            <path d="M275 263 303 279M275 279 303 295M340 280v33M360 268v33" stroke="#aef8e2" strokeOpacity=".65" strokeWidth="4" />
          </g>
          <g className="org-building org-building-left"><path d="M140 300 180 277 222 301 181 325Z" fill="#5c78a1" /><path d="M140 300 181 325v57l-41-25Z" fill="#344f70" /><path d="M181 325 222 301v57l-41 24Z" fill="#243d5d" /></g>
          <g className="org-building org-building-right"><path d="M417 301 459 277 501 301 460 325Z" fill="#5c78a1" /><path d="M417 301 460 325v57l-43-25Z" fill="#344f70" /><path d="M460 325 501 301v57l-41 24Z" fill="#243d5d" /></g>
          <g className="org-building org-building-bottom"><path d="M280 394 320 371 361 395 320 419Z" fill="#5c78a1" /><path d="M280 394 320 419v45l-40-24Z" fill="#344f70" /><path d="M320 419 361 395v45l-41 24Z" fill="#243d5d" /></g>
          {[[177, 270], [463, 270], [177, 356], [463, 356]].map(([x, y], index) => <circle key={index} className={`org-node org-node-${index}`} cx={x} cy={y} r="8" fill="#73ebce" />)}
        </svg>
        <div className="org-status"><Workflow size={16} /><span>{text.status}</span><i /><i /><i /></div>
        <div className="org-ready"><CircleCheck size={15} />{text.ready}</div>
        <div className="org-symbol"><Building2 size={18} /></div>
      </div>
    </aside>
  );
}
