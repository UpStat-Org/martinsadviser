import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2 } from "lucide-react";

type CellMode = "text" | "select";

interface BaseProps {
  value: string | null;
  onSave: (next: string | null) => Promise<void> | void;
  placeholder?: string;
  className?: string;
}

interface TextProps extends BaseProps {
  mode: "text";
}

interface SelectProps extends BaseProps {
  mode: "select";
  options: Array<{ value: string; label: string; badgeClassName?: string }>;
}

type Props = TextProps | SelectProps;

/**
 * Click-to-edit cell. Renders the value as plain text; clicking enters edit
 * mode, blur or Enter commits the save. The parent owns the persistence —
 * we just call `onSave(next)` and show a tiny spinner while it resolves.
 *
 * `stopPropagation` is wired so a wrapper TableRow's `onClick={navigate}`
 * doesn't fire while editing — the parent doesn't need to do anything
 * special.
 */
export function EditableCell(props: Props) {
  const { value, onSave, placeholder, className } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current && props.mode === "text") {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing, props.mode]);

  const commit = async () => {
    const next = draft.trim() === "" ? null : draft;
    if (next === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (props.mode === "select") {
    return (
      <div className={className} onClick={(e) => e.stopPropagation()}>
        <Select
          value={value ?? ""}
          onValueChange={async (v) => {
            setSaving(true);
            try {
              await onSave(v);
            } finally {
              setSaving(false);
            }
          }}
        >
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted/50 -ml-2 pl-2 gap-1">
            <SelectValue placeholder={placeholder ?? "—"} />
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          </SelectTrigger>
          <SelectContent>
            {props.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (!editing) {
    return (
      <div
        className={`cursor-text hover:bg-muted/50 rounded px-1 -ml-1 min-h-[1.5rem] flex items-center ${className ?? ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        {value || <span className="text-muted-foreground">{placeholder ?? "—"}</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`} onClick={(e) => e.stopPropagation()}>
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
        }}
        className="h-7 text-xs"
        placeholder={placeholder}
      />
      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-muted-foreground" />}
    </div>
  );
}
