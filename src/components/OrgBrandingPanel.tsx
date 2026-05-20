import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg, splitWordmark, type OrgBranding } from "@/contexts/OrgContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Save } from "lucide-react";

export function OrgBrandingPanel() {
  const { currentOrg, branding, isOrgOwner, refresh } = useOrg();
  const qc = useQueryClient();
  const { toast } = useToast();

  // Local form state so the live preview updates instantly without writing
  // to the DB on every keystroke.
  const [draft, setDraft] = useState<OrgBranding>(branding);

  useEffect(() => {
    setDraft(branding);
  }, [branding.app_name, branding.tagline, branding.logo_url]);

  const saveBranding = useMutation({
    mutationFn: async (values: OrgBranding) => {
      if (!currentOrg) throw new Error("No active organization");
      // Merge into existing jsonb to preserve unknown keys other surfaces
      // might rely on later. Null logo_url is stored as null (cleared).
      const next = {
        ...(currentOrg.branding ?? {}),
        app_name: values.app_name,
        tagline: values.tagline,
        logo_url: values.logo_url,
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
    draft.logo_url !== branding.logo_url;

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
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 flex items-center gap-3">
          <Logo src={draft.logo_url} title={draft.app_name} className="w-10 h-10 rounded-lg shadow-sm" />
          <Wordmark size="md" tone="dark" primary={wordmark.primary} secondary={wordmark.secondary} />
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">Preview</span>
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
            disabled={!dirty || saveBranding.isPending || draft.app_name.trim().length === 0}
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
