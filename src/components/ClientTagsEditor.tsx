import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TagPicker } from "@/components/TagPicker";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClients } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/hooks/useClients";
import { Tag } from "lucide-react";

/**
 * Inline tag editor on the ClientDetail header. Auto-saves on change with
 * a 600ms debounce so rapid edits don't spam the backend. Reads existing
 * tags from the org-wide client list for suggestions.
 */
export function ClientTagsEditor({ client }: { client: Client }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allClients } = useClients();

  const initial = (client as Client & { tags?: string[] | null }).tags ?? [];
  const [tags, setTags] = useState<string[]>(initial);

  // Suggest from the union of tags already in use across the org.
  const suggestions = useMemo(() => {
    const set = new Set<string>();
    for (const c of allClients ?? []) {
      const ct = (c as Client & { tags?: string[] | null }).tags ?? [];
      for (const tag of ct) set.add(tag);
    }
    return Array.from(set).sort();
  }, [allClients]);

  // Debounced save — fires 600ms after the last change.
  useEffect(() => {
    if (JSON.stringify(tags) === JSON.stringify(initial)) return;
    const handle = setTimeout(async () => {
      const { error } = await supabase
        .from("clients")
        .update({ tags } as never)
        .eq("id", client.id);
      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients", "detail", client.id] });
      toast({ title: t("tags.toastUpdated") });
    }, 600);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags]);

  return (
    <Card>
      <CardContent className="pt-5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Tag className="w-3.5 h-3.5" />
          {t("tags.label")}
        </div>
        <TagPicker value={tags} onChange={setTags} suggestions={suggestions} />
      </CardContent>
    </Card>
  );
}
