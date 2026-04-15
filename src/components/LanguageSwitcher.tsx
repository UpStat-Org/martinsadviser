import { useLayoutEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { type Language, languageLabels } from "@/lib/translations";
import { cn } from "@/lib/utils";

const languages: Language[] = ["pt", "en", "es"];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<Language, HTMLButtonElement | null>>({
    pt: null,
    en: null,
    es: null,
  });
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const active = btnRefs.current[language];
    const container = containerRef.current;
    if (!active || !container) return;
    const c = container.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    setIndicator({ left: a.left - c.left, width: a.width });
  }, [language]);

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-fade-in">
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label="Language"
        className="relative flex items-center gap-0.5 p-1 rounded-full
                   bg-background/70 backdrop-blur-xl
                   border border-border/60
                   shadow-[0_10px_30px_-10px_hsl(234_75%_20%/0.35)]
                   hover:shadow-[0_14px_40px_-10px_hsl(234_75%_25%/0.5)]
                   transition-shadow duration-300"
      >
        {/* Sliding active pill */}
        <span
          aria-hidden
          className="absolute top-1 bottom-1 rounded-full btn-gradient
                     shadow-[0_6px_18px_-4px_hsl(234_75%_58%/0.6)]
                     transition-[left,width] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />

        {languages.map((lang) => {
          const active = lang === language;
          return (
            <button
              key={lang}
              ref={(el) => (btnRefs.current[lang] = el)}
              role="radio"
              aria-checked={active}
              aria-label={languageLabels[lang].label}
              onClick={() => setLanguage(lang)}
              className={cn(
                "relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                "text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300",
                active
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-sm leading-none">{languageLabels[lang].flag}</span>
              <span>{lang}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
