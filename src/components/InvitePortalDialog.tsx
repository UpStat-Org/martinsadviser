import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface InvitePortalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function InvitePortalDialog({ open, onOpenChange, clientId, clientName }: InvitePortalDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-user", {
        body: { email, password, client_id: clientId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: t("portal.inviteSuccess") });
      onOpenChange(false);
      setEmail("");
      setPassword("");
    } catch (error: any) {
      toast({ title: t("portal.inviteError"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{t("portal.inviteClient")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {clientName}
        </p>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("portal.inviteEmail")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="cliente@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label>{t("portal.invitePassword")}</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min. 6 caracteres" />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("common.saving")}</> : t("portal.inviteSend")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
