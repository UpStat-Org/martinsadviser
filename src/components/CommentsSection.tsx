import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { MessageSquare, Send, Trash2, Loader2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/useComments";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

interface CommentsSectionProps {
  entityType: string;
  entityId: string;
}

export function CommentsSection({ entityType, entityId }: CommentsSectionProps) {
  const [body, setBody] = useState("");
  const { data: comments, isLoading } = useComments(entityType, entityId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = () => {
    if (!body.trim()) return;
    createComment.mutate(
      { entity_type: entityType, entity_id: entityId, body: body.trim() },
      { onSuccess: () => setBody("") }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          {t("comments.title")}
          {comments?.length ? <span className="text-sm font-normal text-muted-foreground">({comments.length})</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New comment form */}
        <div className="flex gap-2">
          <Textarea
            placeholder={t("comments.placeholder")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />
          <Button
            size="icon"
            className="shrink-0 self-end"
            onClick={handleSubmit}
            disabled={!body.trim() || createComment.isPending}
          >
            {createComment.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Comments list */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !comments?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("comments.empty")}</p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{comment.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: pt })}
                    </span>
                    {user?.id === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteComment.mutate({ id: comment.id, entity_type: entityType, entity_id: entityId })}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{comment.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
