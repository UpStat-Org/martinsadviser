import { Globe2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { type Language, languageLabels } from "@/lib/translations";

const languages: Language[] = ["pt", "en", "es"];

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-muted-foreground shadow-soft">
      <Globe2 className="h-3.5 w-3.5" aria-hidden />
      <select
        aria-label={t("ui.language")}
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        className="cursor-pointer rounded-sm bg-card text-xs font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      >
        {languages.map((lang) => (
          <option key={lang} value={lang}>{languageLabels[lang].label}</option>
        ))}
      </select>
    </div>
  );
}
