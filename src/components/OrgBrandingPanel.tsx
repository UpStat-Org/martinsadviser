import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg, splitWordmark, type OrgBranding } from "@/contexts/OrgContext";
import { isHexColor } from "@/lib/color";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Save, RotateCcw } from "lucide-react";

const DEFAULT_PREVIEW_PRIMARY = "#5B7BFF"; // Matches the built-in indigo theme
const DEFAULT_PREVIEW_ACCENT = "#F59E0B";  // Matches the original amber accent

export function OrgBrandingPanel() {
  const { currentOrg, branding, isOrgOwner, refresh } = useOrg();
  const qc = useQueryClient();
  const { toast } = useToast();

  // Local form state so the live preview updates instantly without writing
  // to the DB on every keystroke.
  const [draft, setDraft] = useState<OrgBranding>(branding);

  useEffect(() => {
    setDraft(branding);
  }, [branding.app_name, branding.tagline, branding.logo_url, branding.primary_color, branding.accent_color]);

  const saveBranding = useMutation({
    mutationFn: async (values: OrgBranding) => {
      if (!currentOrg) throw new Error("No active organization");
      // Merge into existing jsonb to preserve unknown keys other surfaces
      // might rely on later. Nullable fields are stored as null (cleared).
      const next = {
        ...(currentOrg.branding ?? {}),
        app_name: values.app_name,
        tagline: values.tagline,
        logo_url: values.logo_url,
        primary_color: values.primary_color,
        accent_color: values.accent_color,
      };
      const { error } = await supabase
        .from("organizations")
        .update({ branding: next })
        .eq("id", currentOrg.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      qc.invalidateQueries();
      toast({ title: "Branding atualizado" });
    },
    onError: (e: any) => {
      toast({ title: "Falha ao salvar", description: e.message, variant: "destructive" });
    },
  });

  if (!currentOrg) return null;

  if (!isOrgOwner) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="text-sm">Apenas o owner da organização pode editar o branding.</span>
        </CardContent>
      </Card>
    );
  }

  const wordmark = splitWordmark(draft);
  const dirty =
    draft.app_name !== branding.app_name ||
    draft.tagline !== branding.tagline ||
    draft.logo_url !== branding.logo_url ||
    draft.primary_color !== branding.primary_color ||
    draft.accent_color !== branding.accent_color;

  const primaryValue = draft.primary_color && isHexColor(draft.primary_color)
    ? draft.primary_color
    : DEFAULT_PREVIEW_PRIMARY;
  const primaryIsCustom = !!draft.primary_color;

  const accentValue = draft.accent_color && isHexColor(draft.accent_color)
    ? draft.accent_color
    : DEFAULT_PREVIEW_ACCENT;
  const accentIsCustom = !!draft.accent_color;

  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-base font-semibold">Identidade visual</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Aplicado no sidebar, título da aba e demais superfícies internas. A URL do logo precisa apontar pra um arquivo público (PNG, SVG ou JPG).
          </p>
        </div>

        {/* Live preview */}
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Logo src={draft.logo_url} title={draft.app_name} className="w-10 h-10 rounded-lg shadow-sm" />
            <Wordmark
              size="md"
              tone="dark"
              primary={wordmark.primary}
              secondary={wordmark.secondary}
              accentColor={draft.accent_color}
            />
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-8 px-3 rounded-md text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: primaryValue }}
              tabIndex={-1}
            >
              Botão primário
            </button>
            <span
              className="h-7 px-2.5 inline-flex items-center rounded-md text-[11px] font-semibold"
              style={{
                backgroundColor: accentValue,
                color: "#0b0d2e",
              }}
            >
              Badge accent
            </span>
            <div
              className="h-2 flex-1 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${primaryValue} 0%, ${accentValue} 100%)`,
              }}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="app_name">Nome da aplicação</Label>
            <Input
              id="app_name"
              value={draft.app_name}
              onChange={(e) => setDraft((d) => ({ ...d, app_name: e.target.value }))}
              placeholder="MartinsAdviser"
            />
            <p className="text-[11px] text-muted-foreground">Aparece no título da aba do browser.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline / segunda linha do wordmark</Label>
            <Input
              id="tagline"
              value={draft.tagline}
              onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
              placeholder="Adviser"
            />
            <p className="text-[11px] text-muted-foreground">Opcional. Quando combina com o final do nome, fica em duas linhas estilizadas.</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="logo_url">URL do logo</Label>
            <Input
              id="logo_url"
              value={draft.logo_url ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, logo_url: e.target.value.trim() || null }))}
              placeholder="https://cdn.exemplo.com/logo.svg"
            />
            <p className="text-[11px] text-muted-foreground">Em branco mantém o logo padrão (truck SVG).</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primary_color">Cor primária</Label>
            <div className="flex items-center gap-2">
              <input
                id="primary_color"
                type="color"
                value={primaryValue}
                onChange={(e) => setDraft((d) => ({ ...d, primary_color: e.target.value }))}
                className="h-9 w-12 rounded-md border border-border/50 cursor-pointer bg-background"
              />
              <Input
                value={draft.primary_color ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setDraft((d) => ({ ...d, primary_color: v.length === 0 ? null : v }));
                }}
                placeholder="#5B7BFF"
                className="font-mono"
              />
              {primaryIsCustom && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft((d) => ({ ...d, primary_color: null }))}
                  className="gap-1.5 shrink-0"
                  title="Voltar ao padrão"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Botões, focus ring e item ativo do sidebar.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accent_color">Cor de destaque</Label>
            <div className="flex items-center gap-2">
              <input
                id="accent_color"
                type="color"
                value={accentValue}
                onChange={(e) => setDraft((d) => ({ ...d, accent_color: e.target.value }))}
                className="h-9 w-12 rounded-md border border-border/50 cursor-pointer bg-background"
              />
              <Input
                value={draft.accent_color ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setDraft((d) => ({ ...d, accent_color: v.length === 0 ? null : v }));
                }}
                placeholder="#F59E0B"
                className="font-mono"
              />
              {accentIsCustom && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft((d) => ({ ...d, accent_color: null }))}
                  className="gap-1.5 shrink-0"
                  title="Voltar ao padrão"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Barra do wordmark, badges e highlights secundários.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          {dirty && (
            <Button
              variant="ghost"
              onClick={() => setDraft(branding)}
              disabled={saveBranding.isPending}
            >
              Descartar
            </Button>
          )}
          <Button
            onClick={() => saveBranding.mutate(draft)}
            disabled={
              !dirty
              || saveBranding.isPending
              || draft.app_name.trim().length === 0
              || (draft.primary_color !== null && !isHexColor(draft.primary_color))
              || (draft.accent_color !== null && !isHexColor(draft.accent_color))
            }
            className="gap-2"
          >
            {saveBranding.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
