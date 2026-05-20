import { type ReactNode } from "react";
import { useDocumentUrl } from "@/hooks/useDocumentUrl";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Path stored in permits.document_url (or a legacy absolute URL). */
  path: string | null | undefined;
  className?: string;
  download?: boolean | string;
  children: ReactNode;
  /** Optional click handler (e.g. analytics). */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Renders an <a> that points at a signed URL minted for a permit-documents
 * path. Shows a spinner while the signed URL is being fetched and disables
 * the click during that window. Used by lists that link straight to a
 * document without going through DocumentViewer.
 */
export function DocumentLink({ path, className, download, children, onClick }: Props) {
  const { data: url, isLoading } = useDocumentUrl(path);

  if (!path) return null;

  if (isLoading || !url) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 opacity-60 cursor-wait", className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {children}
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={download}
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  );
}
