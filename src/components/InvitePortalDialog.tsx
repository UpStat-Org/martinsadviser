import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail } from "lucide-react";

interface InvitePortalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function InvitePortalDialog({ open, onOpenChange, clientId, clientName }: InvitePortalDialogProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-user", {
        body: { email, client_id: clientId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t("portal.inviteSuccess"),
        description: t("portal.inviteSentTo").replace("{email}", email),
      });
      onOpenChange(false);
      setEmail("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: t("portal.inviteError"), description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("portal.inviteClient")}</DialogTitle>
          <DialogDescription>
            {t("portal.inviteDescription").replace("{client}", clientName)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("portal.inviteEmail")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t("common.emailPlaceholder")}
            />
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-3 flex gap-2 text-xs text-muted-foreground">
            <Mail className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t("portal.inviteHowItWorks")}</span>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("common.saving")}</>
              ) : (
                t("portal.inviteSend")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
