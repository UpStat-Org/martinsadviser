import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Lock, Pin, PinOff, Trash2, Send, Loader2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useInternalNotes, useCreateInternalNote, useDeleteInternalNote, useUpdateInternalNote } from "@/hooks/useInternalNotes";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

export function InternalNotesSection({ clientId }: { clientId: string }) {
  const [body, setBody] = useState("");
  const { data: notes, isLoading } = useInternalNotes(clientId);
  const create = useCreateInternalNote();
  const remove = useDeleteInternalNote();
  const update = useUpdateInternalNote();
  const { user } = useAuth();
  const { t } = useLanguage();

  const submit = () => {
    if (!body.trim()) return;
    create.mutate({ client_id: clientId, body: body.trim() }, { onSuccess: () => setBody("") });
  };

  return (
    <Card className="border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          {t("notes.internal.title")}
          <span className="text-xs font-normal text-muted-foreground">
            {t("notes.internal.private")}
          </span>
          {notes?.length ? <span className="text-sm font-normal text-muted-foreground ml-auto">{notes.length}</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Textarea
            placeholder={t("notes.internal.placeholder")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            className="resize-none bg-background"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
          />
          <Button
            size="icon"
            className="shrink-0 self-end"
            onClick={submit}
            disabled={!body.trim() || create.isPending}
          >
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !notes?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("notes.internal.empty")}</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className={`flex gap-3 group p-3 rounded-lg ${n.pinned ? "bg-amber-100/60 dark:bg-amber-950/30 border border-amber-300/40" : "bg-background/60"}`}>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{n.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: pt })}
                    </span>
                    {n.pinned && <Pin className="w-3 h-3 text-amber-600" />}
                  </div>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap">{n.body}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7"
                    title={n.pinned ? t("notes.internal.unpin") : t("notes.internal.pin")}
                    onClick={() => update.mutate({ id: n.id, client_id: clientId, pinned: !n.pinned })}
                  >
                    {n.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                  </Button>
                  {user?.id === n.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => remove.mutate({ id: n.id, client_id: clientId })}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
