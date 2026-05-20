import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import type { PermitDocument } from "@/hooks/usePermitDocuments";
import { useDocumentUrl } from "@/hooks/useDocumentUrl";

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
  versions?: PermitDocument[];
}

function isPdf(url: string) {
  return url.toLowerCase().includes(".pdf");
}

function isImage(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
}

export function DocumentViewer({ open, onOpenChange, url, title, versions }: DocumentViewerProps) {
  const { t } = useLanguage();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // The incoming `url` and the version rows store the storage *path*
  // ("<org>/<permit>/<ts>.<ext>") now that the bucket is private. We mint
  // a signed URL per-render via React Query — the hook also accepts legacy
  // absolute URLs for backward compatibility during the cutover.
  const activePath = versions && selectedVersionId
    ? versions.find((v) => v.id === selectedVersionId)?.document_url || url
    : url;
  const { data: resolvedUrl, isLoading: resolving } = useDocumentUrl(activePath);
  const activeUrl = resolvedUrl ?? "";

  const activeVersion = versions?.find((v) => v.id === selectedVersionId);

  // Detection runs on the original path (which preserves the extension)
  // instead of the signed URL (which has query params).
  const pdf = isPdf(activePath);
  const image = isImage(activePath);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelectedVersionId(null); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <DialogTitle className="font-display text-lg truncate">
              {title || t("documents.viewer")}
            </DialogTitle>
            {activeVersion?.is_current && (
              <Badge className="bg-success text-success-foreground shrink-0">{t("documents.current")}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {versions && versions.length > 1 && (
              <Select
                value={selectedVersionId || versions.find((v) => v.is_current)?.id || versions[0]?.id}
                onValueChange={setSelectedVersionId}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t("documents.version")} />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version} — {format(new Date(v.created_at), "dd/MM/yy")}
                      {v.is_current ? ` (${t("documents.current").toLowerCase()})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" asChild disabled={!activeUrl}>
              <a
                href={activeUrl || "#"}
                download
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!activeUrl}
                onClick={(e) => { if (!activeUrl) e.preventDefault(); }}
              >
                <Download className="w-4 h-4 mr-2" />
                {t("documents.download")}
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild disabled={!activeUrl}>
              <a
                href={activeUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!activeUrl}
                onClick={(e) => { if (!activeUrl) e.preventDefault(); }}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted/30">
          {resolving || !activeUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pdf ? (
            <iframe
              src={`${activeUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0"
              title={title || "Document"}
            />
          ) : image ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={activeUrl}
                alt={title || "Document"}
                className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-muted-foreground">{t("documents.noPreview")}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
