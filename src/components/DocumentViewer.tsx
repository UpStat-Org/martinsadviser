import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
}

function isPdf(url: string) {
  return url.toLowerCase().includes(".pdf");
}

function isImage(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
}

export function DocumentViewer({ open, onOpenChange, url, title }: DocumentViewerProps) {
  const { t } = useLanguage();
  const pdf = isPdf(url);
  const image = isImage(url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="font-display text-lg truncate pr-4">
            {title || t("documents.viewer")}
          </DialogTitle>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <a href={url} download target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-2" />
                {t("documents.download")}
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted/30">
          {pdf ? (
            <iframe
              src={`${url}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0"
              title={title || "Document"}
            />
          ) : image ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={url}
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
