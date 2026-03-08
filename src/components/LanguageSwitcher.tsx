import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { type Language, languageLabels } from "@/lib/translations";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const languages: Language[] = ["pt", "en", "es"];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-12 right-0 mb-1 rounded-lg border bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setLanguage(lang);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm w-full hover:bg-accent transition-colors min-w-[160px]",
                lang === language && "bg-primary/10 text-primary font-medium"
              )}
            >
              <span className="text-lg">{languageLabels[lang].flag}</span>
              <span>{languageLabels[lang].label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-full bg-card border shadow-lg hover:shadow-xl transition-all text-sm font-medium text-foreground"
      >
        <span className="text-lg">{languageLabels[language].flag}</span>
        <Globe className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
