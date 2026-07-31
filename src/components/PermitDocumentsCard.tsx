import { useRef, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DocumentLink } from "@/components/DocumentLink";
import { FileText, Upload, Loader2, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/utils";
import {
  useAddPermitDocument,
  useDeletePermitDocument,
  type PermitDocument,
} from "@/hooks/usePermitDocuments";

interface Props {
  permitId: string;
  permitLabel: string;
  documents: PermitDocument[] | undefined;
  /** Falls back to permits.document_url for permits predating versioning. */
  fallbackUrl: string | null | undefined;
  onView: () => void;
}

/**
 * Document versions for a permit: upload a new one, view any version, delete.
 *
 * usePermitDocuments already exposed add/delete but nothing rendered them, so
 * the only way to attach a document was to edit the permit itself — which
 * overwrites rather than versions.
 */
export function PermitDocumentsCard({ permitId, permitLabel, documents, fallbackUrl, onView }: Props) {
  const { t } = useLanguage();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const addDoc = useAddPermitDocument();
  const deleteDoc = useDeletePermitDocument();

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PermitDocument | null>(null);

  const current = documents?.find((d) => d.is_current) ?? documents?.[0];
  const documentUrl = current?.document_url || fallbackUrl;

  const handleFile = async (file: File) => {
    if (!currentOrg?.id) {
      toast({ title: t("documents.uploadError"), description: "No active organization", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      // The org_id prefix is enforced by the storage policies — an upload
      // without it is rejected.
      const path = `${currentOrg.id}/${permitId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("permit-documents")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      // Only the path is stored; the bucket is private and reads go through a
      // short-lived signed URL.
      await addDoc.mutateAsync({
        permitId,
        documentUrl: path,
        fileName: file.name,
        notes: notes.trim() || undefined,
      });
      setNotes("");
    } catch (e: unknown) {
      toast({ title: t("documents.uploadError"), description: errorMessage(e), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const busy = uploading || addDoc.isPending;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {t("permitDetail.docsTitle")}
          {documents?.length ? (
            <Badge variant="outline" className="ml-auto text-[10px]">
              {t("permitDetail.versionCount").replace("{count}", String(documents.length))}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {documentUrl ? (
          <button
            onClick={onView}
            className="w-full rounded-md border border-border/50 p-3 text-left hover:bg-muted/40 transition-colors"
          >
            <div className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              {current?.file_name || t("permitDetail.currentDocument")}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t("permitDetail.openViewer")}
            </div>
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">{t("permitDetail.noDocs")}</p>
        )}

        {documents?.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-2 rounded-md bg-muted/40 border border-border/50 p-2.5"
          >
            <DocumentLink path={doc.document_url} className="flex-1 min-w-0 hover:underline">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">v{doc.version}</span>
                {doc.is_current && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    {t("permitDetail.currentVersion")}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {doc.file_name || "—"} · {format(new Date(doc.created_at), "MM/dd/yyyy")}
              </div>
              {doc.notes && <div className="text-xs text-muted-foreground italic truncate">{doc.notes}</div>}
            </DocumentLink>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
              aria-label={t("common.delete")}
              disabled={deleteDoc.isPending}
              onClick={() => setPendingDelete(doc)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}

        {/* Upload a new version */}
        <div className="space-y-2 pt-1 border-t border-border/50">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("permitDetail.versionNotes")}
            disabled={busy}
            className="h-9 text-sm"
          />
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            variant="outline"
            className="w-full gap-2"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {documents?.length ? t("permitDetail.uploadNewVersion") : t("permitDetail.uploadDocument")}
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("permitDetail.deleteVersionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("permitDetail.deleteVersionDesc")
                .replace("{version}", String(pendingDelete?.version ?? ""))
                .replace("{permit}", permitLabel)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) deleteDoc.mutate({ id: pendingDelete.id, permitId });
                setPendingDelete(null);
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
