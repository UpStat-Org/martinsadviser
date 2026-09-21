import { useEffect, useRef, useState } from "react";
import { Check, Eraser, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortalSignDocument } from "@/hooks/usePortal";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  itemId: string;
  documentName: string;
  defaultEmail?: string | null;
}

export function PortalSignatureDialog({ open, onOpenChange, orderId, itemId, documentName, defaultEmail }: Props) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const sign = usePortalSignDocument();

  useEffect(() => {
    if (!open) return;
    setEmail(defaultEmail ?? "");
    setName("");
    setHasInk(false);
    canvasRef.current?.getContext("2d")?.clearRect(0, 0, 700, 220);
  }, [open, defaultEmail]);

  const point = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const source = "touches" in event ? event.touches[0] : event;
    return {
      x: (source.clientX - rect.left) * (canvas.width / rect.width),
      y: (source.clientY - rect.top) * (canvas.height / rect.height),
    };
  };
  const start = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const p = point(event);
    context.beginPath(); context.moveTo(p.x, p.y); setDrawing(true);
  };
  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    event.preventDefault();
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const p = point(event);
    context.strokeStyle = "#111827"; context.lineWidth = 2.5; context.lineCap = "round";
    context.lineTo(p.x, p.y); context.stroke(); setHasInk(true);
  };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };
  const submit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !name.trim() || !hasInk) return;
    sign.mutate({ orderId, itemId, documentName, signerName: name.trim(), signerEmail: email.trim(), signatureData: canvas.toDataURL("image/png") }, {
      onSuccess: () => { clear(); setName(""); onOpenChange(false); },
    });
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{t("portal2.signDocument")}</DialogTitle><DialogDescription>{documentName}</DialogDescription></DialogHeader><div className="space-y-4">
    <div className="grid sm:grid-cols-2 gap-3"><div className="space-y-2"><Label>{t("signature.signerName")} *</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div><div className="space-y-2"><Label>{t("signature.signerEmail")}</Label><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></div>
    <div className="space-y-2"><Label>{t("signature.draw")}</Label><div className="border rounded-md bg-white overflow-hidden"><canvas ref={canvasRef} width={700} height={220} className="w-full h-44 touch-none cursor-crosshair" onMouseDown={start} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)} onTouchStart={start} onTouchMove={draw} onTouchEnd={() => setDrawing(false)} /></div><Button variant="ghost" size="sm" onClick={clear}><Eraser />{t("signature.clear")}</Button></div>
    <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button onClick={submit} disabled={!name.trim() || !hasInk || sign.isPending}>{sign.isPending ? <Loader2 className="animate-spin" /> : <Check />}{t("signature.confirm")}</Button></div>
  </div></DialogContent></Dialog>;
}
