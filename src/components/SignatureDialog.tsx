import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import { Eraser, Check, Loader2 } from "lucide-react";

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  permitId?: string;
}

export function SignatureDialog({ open, onOpenChange, clientId, permitId }: SignatureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    ctx.moveTo(point.clientX - rect.left, point.clientY - rect.top);
    setDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineTo(point.clientX - rect.left, point.clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !signerName || !documentName) return;
    setSaving(true);
    try {
      const signatureData = canvas.toDataURL("image/png");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("document_signatures").insert({
        user_id: user.id,
        client_id: clientId,
        permit_id: permitId || null,
        document_name: documentName,
        signer_name: signerName,
        signer_email: signerEmail || null,
        signature_data: signatureData,
      });
      if (error) throw error;

      toast({ title: t("signature.saved") });
      queryClient.invalidateQueries({ queryKey: ["signatures", clientId] });
      onOpenChange(false);
      setSignerName("");
      setSignerEmail("");
      setDocumentName("");
      clearCanvas();
    } catch (e: any) {
      toast({ title: t("signature.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("signature.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("signature.signerName")}</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <Label>{t("signature.signerEmail")}</Label>
              <Input value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="john@email.com" type="email" />
            </div>
          </div>
          <div>
            <Label>{t("signature.documentName")}</Label>
            <Input value={documentName} onChange={(e) => setDocumentName(e.target.value)} placeholder={t("signature.documentPlaceholder")} />
          </div>
          <div>
            <Label>{t("signature.draw")}</Label>
            <div className="border rounded-lg overflow-hidden bg-background">
              <canvas
                ref={canvasRef}
                width={440}
                height={180}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={clearCanvas} className="mt-1">
              <Eraser className="w-4 h-4 mr-1" /> {t("signature.clear")}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !signerName || !documentName}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            {t("signature.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
