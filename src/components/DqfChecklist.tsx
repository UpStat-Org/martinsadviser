import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, AlertTriangle, Plus, FileText, Trash2, ExternalLink, Upload, Loader2 } from "lucide-react";
import {
  DQF_KINDS,
  useDriverDocuments,
  useCreateDriverDocument,
  useDeleteDriverDocument,
  type DqfKind,
} from "@/hooks/useDqf";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { uploadComplianceDocument } from "@/lib/storage";
import { useDocumentUrl } from "@/hooks/useDocumentUrl";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DqfChecklistProps {
  driverId: string;
  driverName: string;
}

function isCurrent(doc: { kind: DqfKind; expires_on: string | null; created_at: string }): boolean {
  const def = DQF_KINDS.find((k) => k.kind === doc.kind);
  if (!def) return false;
  if (doc.expires_on) {
    return new Date(doc.expires_on).getTime() > Date.now();
  }
  // No expiration date: annual docs (MVR) are "current" only within 12 months
  // of upload; non-annual docs (application, road_test) are always current.
  if (!def.annual) return true;
  const ageMs = Date.now() - new Date(doc.created_at).getTime();
  return ageMs < 365 * 86_400_000;
}

function DocOpenLink({ path }: { path: string }) {
  const { t } = useLanguage();
  const { data: url } = useDocumentUrl(path);
  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center"
      title={t("dqf.openDoc")}
    >
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  );
}

export function DqfChecklist({ driverId, driverName }: DqfChecklistProps) {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { data: docs } = useDriverDocuments(driverId);
  const createMut = useCreateDriverDocument();
  const deleteMut = useDeleteDriverDocument();

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<{
    kind: DqfKind;
    issued_on: string;
    expires_on: string;
    document_url: string;
    notes: string;
  }>({ kind: "mvr", issued_on: "", expires_on: "", document_url: "", notes: "" });

  // For each DQF kind, find the latest doc and decide if it's "current".
  const byKind = new Map<DqfKind, ReturnType<typeof useDriverDocuments>["data"] extends (infer T)[] | undefined ? T : never>();
  for (const d of docs ?? []) {
    if (!byKind.has(d.kind)) byKind.set(d.kind, d);
  }

  const required = DQF_KINDS.filter((k) => k.kind !== "other");
  const ready = required.filter((k) => {
    const latest = byKind.get(k.kind);
    return latest ? isCurrent(latest) : false;
  });
  const readiness = Math.round((ready.length / required.length) * 100);

  const handleSave = async () => {
    if (!user) return;
    setUploading(true);
    try {
      let storedPath = form.document_url || null;
      if (pendingFile && currentOrg) {
        // Use a temp id for the path — we don't know the final doc id yet.
        // Storage path is `<org_id>/dqf/<driver_id>/<timestamp>.<ext>`.
        const path = await uploadComplianceDocument(currentOrg.id, "dqf", driverId, pendingFile);
        if (!path) {
          toast({ title: t("dqf.uploadFailed"), variant: "destructive" });
          return;
        }
        storedPath = path;
      }
      await createMut.mutateAsync({
        driver_id: driverId,
        user_id: user.id,
        kind: form.kind,
        issued_on: form.issued_on || null,
        expires_on: form.expires_on || null,
        document_url: storedPath,
        notes: form.notes || null,
      });
      setOpen(false);
      setForm({ kind: "mvr", issued_on: "", expires_on: "", document_url: "", notes: "" });
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-display text-base">{t("dqf.title").replace("{name}", driverName)}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              className={
                readiness === 100
                  ? "bg-success text-success-foreground"
                  : readiness >= 75
                  ? "bg-warning text-warning-foreground"
                  : "bg-destructive text-destructive-foreground"
              }
            >
              {t("dqf.complete").replace("{percent}", String(readiness))}
            </Badge>
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {t("dqf.addDoc")}
            </Button>
          </div>
        </div>
        <Progress value={readiness} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {required.map((k) => {
            const latest = byKind.get(k.kind);
            const current = latest && isCurrent(latest);
            return (
              <li
                key={k.kind}
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
              >
                {current ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                ) : latest ? (
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t(`dqf.kind.${k.kind}`)}</p>
                  {latest ? (
                    <p className="text-xs text-muted-foreground">
                      {latest.expires_on
                        ? t("dqf.expiresOn").replace("{date}", format(new Date(latest.expires_on), "MMM dd, yyyy"))
                        : k.annual
                        ? t("dqf.receivedAnnual").replace("{date}", format(new Date(latest.created_at), "MMM dd, yyyy"))
                        : t("dqf.received").replace("{date}", format(new Date(latest.created_at), "MMM dd, yyyy"))}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("dqf.notRegistered")}</p>
                  )}
                </div>
                {latest?.document_url && <DocOpenLink path={latest.document_url} />}
                {latest && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      if (confirm(t("dqf.confirmRemove"))) deleteMut.mutate(latest.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <FileText className="w-4 h-4 inline mr-1" />
              {t("dqf.dialogTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("dqf.type")}</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as DqfKind })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DQF_KINDS.map((k) => (
                    <SelectItem key={k.kind} value={k.kind}>{t(`dqf.kind.${k.kind}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("dqf.issuedOn")}</Label>
                <Input type="date" value={form.issued_on} onChange={(e) => setForm({ ...form, issued_on: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dqf.expiresIn")}</Label>
                <Input type="date" value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("dqf.fileLabel")}</Label>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border/60 file:text-sm file:bg-muted hover:file:bg-muted/80 file:cursor-pointer"
              />
              {pendingFile && <p className="text-[10px] text-muted-foreground">{pendingFile.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t("dqf.externalUrl")}</Label>
              <Input placeholder="https://..." value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("dqf.notes")}</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={uploading || createMut.isPending}>
              {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
