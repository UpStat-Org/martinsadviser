import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg, splitWordmark, type OrgBranding } from "@/contexts/OrgContext";
import { isHexColor } from "@/lib/color";
import { uploadOrgLogo, ORG_LOGO_MAX_BYTES, ORG_LOGO_ACCEPT } from "@/lib/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Save, RotateCcw, Upload, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const DEFAULT_PREVIEW_PRIMARY = "#5B7BFF"; // Matches the built-in indigo theme
const DEFAULT_PREVIEW_ACCENT = "#F59E0B";  // Matches the original amber accent

export function OrgBrandingPanel() {
  const { currentOrg, branding, isOrgAdmin, refresh } = useOrg();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Local form state so the live preview updates instantly without writing
  // to the DB on every keystroke.
  const [draft, setDraft] = useState<OrgBranding>(branding);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = async (file: File | undefined) => {
    if (!file || !currentOrg) return;
    if (file.size > ORG_LOGO_MAX_BYTES) {
      toast({ title: t("orgBranding.imageTooLarge"), description: t("orgBranding.imageTooLargeDesc"), variant: "destructive" });
      return;
    }
    if (!ORG_LOGO_ACCEPT.split(",").includes(file.type)) {
      toast({ title: t("orgBranding.formatUnsupported"), description: t("orgBranding.formatUnsupportedDesc"), variant: "destructive" });
      return;
    }
    setUploading(true);
    const url = await uploadOrgLogo(currentOrg.id, file);
    setUploading(false);
    if (!url) {
      toast({ title: t("orgBranding.uploadFailed"), description: t("orgBranding.uploadFailedDesc"), variant: "destructive" });
      return;
    }
    // The file is now in storage; the URL only persists once "Salvar" runs.
    setDraft((d) => ({ ...d, logo_url: url }));
  };

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
      // Saved through a SECURITY DEFINER RPC (not a direct table UPDATE) so
      // org admins can edit branding without the owner-only RLS policy on
      // organizations blocking them. The RPC writes only the branding column.
      const { error } = await (supabase as any).rpc("update_org_branding", {
        p_org_id: currentOrg.id,
        p_branding: next,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      qc.invalidateQueries();
      toast({ title: t("orgBranding.saved") });
    },
    onError: (e: any) => {
      toast({ title: t("orgBranding.saveFailed"), description: e.message, variant: "destructive" });
    },
  });

  if (!currentOrg) return null;

  if (!isOrgAdmin) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="text-sm">{t("orgBranding.ownerOnly")}</span>
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
          <h3 className="text-base font-semibold">{t("orgBranding.identityTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("orgBranding.appNameHint")}
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
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">{t("common.preview")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-8 px-3 rounded-md text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: primaryValue }}
              tabIndex={-1}
            >
              {t("orgBranding.previewButton")}
            </button>
            <span
              className="h-7 px-2.5 inline-flex items-center rounded-md text-[11px] font-semibold"
              style={{
                backgroundColor: accentValue,
                color: "#0b0d2e",
              }}
            >
              {t("orgBranding.previewBadge")}
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
            <Label htmlFor="app_name">{t("orgBranding.appNameLabel")}</Label>
            <Input
              id="app_name"
              value={draft.app_name}
              onChange={(e) => setDraft((d) => ({ ...d, app_name: e.target.value }))}
              placeholder="MartinsAdviser"
            />
            <p className="text-[11px] text-muted-foreground">{t("orgBranding.appNameHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">{t("orgBranding.taglineLabel")}</Label>
            <Input
              id="tagline"
              value={draft.tagline}
              onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
              placeholder="Adviser"
            />
            <p className="text-[11px] text-muted-foreground">{t("orgBranding.taglineHint")}</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("orgBranding.logoLabel")}</Label>
            <div className="flex items-center gap-3">
              <Logo
                src={draft.logo_url}
                title={draft.app_name}
                className="w-12 h-12 rounded-lg border border-border/50 bg-muted/40 shrink-0"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept={ORG_LOGO_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  void handleLogoFile(e.target.files?.[0]);
                  // Reset so re-picking the same file fires onChange again.
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {draft.logo_url ? t("orgBranding.swapImage") : t("orgBranding.uploadImage")}
              </Button>
              {draft.logo_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft((d) => ({ ...d, logo_url: null }))}
                  disabled={uploading}
                  className="gap-1.5 text-muted-foreground"
                  title={t("orgBranding.removeLogo")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{t("orgBranding.uploadHint")}</p>
            <Input
              value={draft.logo_url ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, logo_url: e.target.value.trim() || null }))}
              placeholder={t("orgBranding.logoUrlPlaceholder")}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primary_color">{t("orgBranding.primaryColor")}</Label>
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
                  title={t("orgBranding.resetTitle")}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("orgBranding.primaryHint")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accent_color">{t("orgBranding.accentColor")}</Label>
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
                  title={t("orgBranding.resetTitle")}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("orgBranding.accentHint")}
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
              {t("common.cancel")}
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
            {t("common.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
