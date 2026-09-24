import { BadgeCheck, KeyRound, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/styles/auth-scenes.css";

const copy = {
  pt: { label: "ACESSO SEGURO", title: "O time certo, conectado.", subtitle: "Permissões claras desde o início.", status: "Verificação de acesso", granted: "Pronto para conectar" },
  en: { label: "SECURE ACCESS", title: "The right team, connected.", subtitle: "Clear permissions from the start.", status: "Access verification", granted: "Ready to connect" },
  es: { label: "ACCESO SEGURO", title: "El equipo correcto, conectado.", subtitle: "Permisos claros desde el inicio.", status: "Verificación de acceso", granted: "Listo para conectar" },
};

export function SignupAccessScene() {
  const { language } = useLanguage();
  const text = copy[language];

  return (
    <aside className="auth-scene access-scene">
      <div className="auth-scene-heading">
        <span className="auth-scene-eyebrow"><span />{text.label}</span>
        <h2>{text.title}</h2>
        <p>{text.subtitle}</p>
      </div>
      <div className="access-scene-art" aria-hidden="true">
        <div className="access-orbit access-orbit-one" />
        <div className="access-orbit access-orbit-two" />
        <svg viewBox="0 0 640 500" className="access-network">
          <defs>
            <linearGradient id="access-card" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#254459" /><stop offset="1" stopColor="#132b3b" /></linearGradient>
            <linearGradient id="access-core" x1="0" x2="1"><stop stopColor="#6cf0c5" /><stop offset="1" stopColor="#51a9ff" /></linearGradient>
          </defs>
          <path className="access-line" d="M114 138 320 250 502 126M138 372 320 250 512 364" fill="none" stroke="#7eeecb" strokeOpacity=".35" strokeWidth="2" strokeDasharray="4 9" />
          <path d="M114 138 320 250 502 126M138 372 320 250 512 364" fill="none" stroke="#9cd6e3" strokeOpacity=".1" strokeWidth="12" />
          {[[114, 138], [502, 126], [138, 372], [512, 364]].map(([x, y], index) => <g key={index} className={`access-node access-node-${index}`}><circle cx={x} cy={y} r="23" fill="#112b3b" stroke="#79d6c1" strokeOpacity=".5" /><circle cx={x} cy={y} r="7" fill="#78efc9" /></g>)}
          <g className="access-id-card">
            <rect x="242" y="162" width="158" height="176" rx="20" fill="url(#access-card)" stroke="#8bdbcf" strokeOpacity=".5" />
            <rect x="259" y="182" width="124" height="10" rx="5" fill="#a1dbdc" opacity=".45" />
            <circle cx="289" cy="233" r="19" fill="url(#access-core)" />
            <path d="M277 266c8-18 42-18 50 0" fill="#6cebc5" opacity=".75" />
            <path d="M331 222h34M331 238h27M331 254h20" stroke="#9bd7df" strokeOpacity=".6" strokeWidth="6" strokeLinecap="round" />
            <rect x="260" y="290" width="122" height="25" rx="8" fill="#6be9c3" fillOpacity=".15" />
            <path d="m280 302 5 5 10-11" fill="none" stroke="#7cf2cf" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M302 302h55" stroke="#8ae5d2" strokeWidth="4" strokeLinecap="round" />
          </g>
          <circle className="access-pulse" cx="320" cy="250" r="104" fill="none" stroke="#6bedc2" strokeOpacity=".35" />
        </svg>
        <div className="access-status"><ShieldCheck size={16} /><span>{text.status}</span><i /></div>
        <div className="access-granted"><BadgeCheck size={15} />{text.granted}</div>
        <div className="access-key"><KeyRound size={16} /></div>
      </div>
    </aside>
  );
}
