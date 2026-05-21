import { useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  disabled?: boolean;
}

/**
 * Inline tag editor. Type + Enter or comma to add. Click X to remove.
 * Tags are normalized to lowercase trimmed strings so duplicates collapse.
 */
export function TagPicker({ value, onChange, suggestions = [], disabled }: Props) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState("");

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (value.includes(tag)) return;
    onChange([...value, tag]);
    setDraft("");
  };

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const remainingSuggestions = suggestions.filter((s) => !value.includes(s)).slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-background p-2 min-h-[2.5rem]">
        {value.map((tag) => (
          <Badge key={tag} variant="outline" className="gap-1 pl-2 pr-1">
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded hover:bg-muted/60 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}
        {!disabled && (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={value.length === 0 ? t("tags.placeholder") : ""}
            className="border-0 shadow-none p-0 h-auto flex-1 min-w-[120px] focus-visible:ring-0"
          />
        )}
      </div>
      {!disabled && remainingSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {remainingSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-2.5 h-2.5" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
