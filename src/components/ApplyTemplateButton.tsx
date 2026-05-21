import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/contexts/OrgContext";
import { useTaskTemplates, useApplyTaskTemplate } from "@/hooks/useTaskTemplates";

/**
 * "Apply template" button that lives on the ClientDetail. Opens a dialog
 * that lets the user pick a template + reference date and materialises
 * the tasks. No-op if there are no templates yet.
 */
export function ApplyTemplateButton({ clientId }: { clientId: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { data: templates } = useTaskTemplates();
  const applyMut = useApplyTaskTemplate();

  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [applyDate, setApplyDate] = useState(new Date().toISOString().slice(0, 10));

  const apply = async () => {
    const template = templates?.find((t) => t.id === templateId);
    if (!template || !user || !currentOrg) return;
    await applyMut.mutateAsync({
      template,
      clientId,
      orgId: currentOrg.id,
      userId: user.id,
      applyDate: new Date(applyDate),
    });
    setOpen(false);
  };

  if (!templates || templates.length === 0) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        {t("taskTemplates.apply")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("taskTemplates.applyTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("taskTemplates.title")}</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                <SelectContent>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>{tpl.name} ({tpl.items.length})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("taskTemplates.applyDate")}</Label>
              <Input type="date" value={applyDate} onChange={(e) => setApplyDate(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">{t("taskTemplates.applyHint")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={apply} disabled={!templateId || applyMut.isPending}>{t("taskTemplates.confirmApply")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
