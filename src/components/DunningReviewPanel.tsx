import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { MailCheck, Check, X, Loader2, Mail, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDunningQueue, useApproveDunning, useRejectDunning } from "@/hooks/useDunning";

export function DunningReviewPanel() {
  const { t } = useLanguage();
  const { data: drafts, isLoading } = useDunningQueue();
  const approve = useApproveDunning();
  const reject = useRejectDunning();

  return (
    <Card className="border-border/50 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
              <MailCheck className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-base">{t("dunning.queueTitle")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("dunning.queueSubtitle")}</p>
            </div>
          </div>
          {drafts && drafts.length > 0 && (
            <Badge variant="outline" className="font-bold">
              {drafts.length}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !drafts?.length ? (
          <EmptyState
            icon={<MailCheck className="w-9 h-9 text-success" />}
            title={t("dunning.emptyTitle")}
            description={t("dunning.emptyDesc")}
          />
        ) : (
          <div className="space-y-2">
            {drafts.map((d) => (
              <div
                key={d.id}
                className="rounded-md border border-border/50 bg-muted/20 p-3 flex flex-col sm:flex-row sm:items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold truncate">
                      {d.clients?.company_name || "—"}
                    </span>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      {d.channel === "whatsapp" ? (
                        <MessageCircle className="w-3 h-3" />
                      ) : (
                        <Mail className="w-3 h-3" />
                      )}
                      {d.channel}
                    </Badge>
                  </div>
                  {d.subject && <div className="text-xs font-medium text-foreground/80">{d.subject}</div>}
                  <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3 mt-0.5">
                    {d.body}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1"
                    disabled={approve.isPending || reject.isPending}
                    onClick={() => approve.mutate(d.id)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t("dunning.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-destructive hover:text-destructive"
                    disabled={approve.isPending || reject.isPending}
                    onClick={() => reject.mutate(d.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("dunning.reject")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
