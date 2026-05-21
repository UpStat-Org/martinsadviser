import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/contexts/OrgContext";
import {
  useTimeEntries,
  useCreateTimeEntry,
  useDeleteTimeEntry,
} from "@/hooks/useTimeTracking";
import { format } from "date-fns";

interface Props {
  taskId: string;
  clientId: string | null;
}

export function TaskTimeLogger({ taskId, clientId }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { data: entries } = useTimeEntries({ taskId });
  const createMut = useCreateTimeEntry();
  const deleteMut = useDeleteTimeEntry();

  const [minutes, setMinutes] = useState(15);
  const [note, setNote] = useState("");

  const total = (entries ?? []).reduce((s, e) => s + e.minutes, 0);

  const add = async () => {
    if (!user || !currentOrg || minutes <= 0) return;
    await createMut.mutateAsync({
      task_id: taskId,
      user_id: user.id,
      client_id: clientId,
      minutes,
      note: note || null,
      logged_at: new Date().toISOString(),
    });
    setMinutes(15);
    setNote("");
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          {t("timeTracking.log")}
        </div>
        <Badge variant="secondary">
          {t("timeTracking.totalHours")}: {(total / 60).toFixed(1)}h
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">{t("timeTracking.minutes")}</Label>
          <Input
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value, 10) || 0)}
            className="h-8 text-xs"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-[10px]">{t("timeTracking.note")}</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <Button size="sm" onClick={add} disabled={minutes <= 0 || createMut.isPending} className="w-full gap-1.5 h-8">
        <Plus className="w-3 h-3" />
        {t("timeTracking.log")}
      </Button>

      {entries && entries.length > 0 && (
        <ul className="space-y-1 max-h-40 overflow-y-auto">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-xs rounded-md bg-muted/40 p-2">
              <Badge variant="outline" className="font-mono">{e.minutes}m</Badge>
              <span className="flex-1 min-w-0 truncate">{e.note ?? "—"}</span>
              <span className="text-[10px] text-muted-foreground">{format(new Date(e.logged_at), "MMM dd HH:mm")}</span>
              <button onClick={() => deleteMut.mutate(e.id)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
