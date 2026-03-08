import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { PenLine } from "lucide-react";

interface SignatureViewerProps {
  clientId: string;
}

export function SignatureViewer({ clientId }: SignatureViewerProps) {
  const { t } = useLanguage();

  const { data: signatures, isLoading } = useQuery({
    queryKey: ["signatures", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_signatures")
        .select("*")
        .eq("client_id", clientId)
        .order("signed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  if (!signatures?.length) return <p className="text-muted-foreground text-sm text-center py-8">{t("signature.empty")}</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {signatures.map((sig) => (
        <Card key={sig.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm flex items-center gap-2">
                  <PenLine className="w-4 h-4 text-primary" />
                  {sig.document_name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{sig.signer_name} {sig.signer_email && `• ${sig.signer_email}`}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {format(new Date(sig.signed_at), "dd/MM/yyyy HH:mm")}
              </Badge>
            </div>
            <div className="border rounded-lg p-2 bg-muted/30">
              <img src={sig.signature_data} alt="Signature" className="w-full h-20 object-contain" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
