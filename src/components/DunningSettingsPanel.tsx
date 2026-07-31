import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, Lock, Loader2, Plus, X, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrg } from "@/contexts/OrgContext";
import {
  useDunningSettings,
  useUpdateDunningSettings,
  DUNNING_DEFAULTS,
  type DunningSettings,
} from "@/hooks/useDunning";

type Input_ = Omit<DunningSettings, "org_id" | "created_at" | "updated_at">;

/** Variables the generate-dunning engine substitutes in subject/body. */
const TEMPLATE_VARS = ["{company_name}", "{amount}", "{due_date}", "{days_overdue}"];

const CHANNELS = ["email", "whatsapp"] as const;

/**
 * Settings side of the dunning engine. The approval queue (DunningReviewPanel)
 * has been shipping since the engine landed, but the settings hooks had no UI —
 * so every org ran on DUNNING_DEFAULTS with no way to change the cadence, the
 * channels or the message.
 */
export function DunningSettingsPanel() {
  const { t } = useLanguage();
  const { isOrgAdmin } = useOrg();
  const { data, isLoading } = useDunningSettings();
  const update = useUpdateDunningSettings();

  const current: Input_ = useMemo(
    () => ({
      enabled: data?.enabled ?? DUNNING_DEFAULTS.enabled,
      auto_send: data?.auto_send ?? DUNNING_DEFAULTS.auto_send,
      stage_days: data?.stage_days ?? DUNNING_DEFAULTS.stage_days,
      channels: data?.channels ?? DUNNING_DEFAULTS.channels,
      subject: data?.subject ?? DUNNING_DEFAULTS.subject,
      body: data?.body ?? DUNNING_DEFAULTS.body,
    }),
    [data],
  );

  // Toggles and stages save on change; the free-text template is buffered
  // behind an explicit Save so we don't fire a write per keystroke.
  const [subject, setSubject] = useState(current.subject);
  const [body, setBody] = useState(current.body);
  const [newStage, setNewStage] = useState("");

  useEffect(() => {
    setSubject(current.subject);
    setBody(current.body);
  }, [current.subject, current.body]);

  const save = (patch: Partial<Input_>) => update.mutate({ ...current, ...patch });

  const disabled = !isOrgAdmin || update.isPending;
  const templateDirty = subject !== current.subject || body !== current.body;

  const addStage = () => {
    const day = Number(newStage);
    if (!Number.isInteger(day) || day < 1 || current.stage_days.includes(day)) return;
    save({ stage_days: [...current.stage_days, day].sort((a, b) => a - b) });
    setNewStage("");
  };

  // Keep at least one stage: an empty array leaves the engine enabled but
  // silently never firing, which reads as a bug rather than a setting.
  const canRemoveStage = current.stage_days.length > 1;
  const removeStage = (day: number) => {
    if (!canRemoveStage) return;
    save({ stage_days: current.stage_days.filter((d) => d !== day) });
  };

  const toggleChannel = (channel: string, on: boolean) =>
    save({
      channels: on
        ? [...current.channels, channel]
        : current.channels.filter((c) => c !== channel),
    });

  return (
    <Card className="border-border/50 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-base">{t("dunningSettings.title")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("dunningSettings.subtitle")}</p>
            </div>
          </div>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={current.enabled}
              disabled={disabled}
              onCheckedChange={(v) => save({ enabled: v })}
            />
          )}
        </div>

        {!isOrgAdmin && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            {t("dunningSettings.adminOnly")}
          </div>
        )}

        {/* Escalation cadence */}
        <div>
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("dunningSettings.stages")}
          </Label>
          <p className="text-xs text-muted-foreground mt-1">{t("dunningSettings.stagesDesc")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {current.stage_days.map((day) => (
              <Badge key={day} variant="outline" className="h-8 gap-1.5 pl-2.5 pr-1.5 text-xs">
                {t("dunningSettings.dayN").replace("{days}", String(day))}
                <button
                  type="button"
                  aria-label={t("common.delete")}
                  disabled={disabled || !current.enabled || !canRemoveStage}
                  onClick={() => removeStage(day)}
                  className="rounded-sm p-0.5 hover:bg-muted disabled:opacity-40"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStage(); } }}
                placeholder={t("dunningSettings.addStage")}
                disabled={disabled || !current.enabled}
                className="h-8 w-28 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                disabled={disabled || !current.enabled || !newStage}
                onClick={addStage}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Channels */}
        <div>
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("dunningSettings.channels")}
          </Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {CHANNELS.map((channel) => (
              <div
                key={channel}
                className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2"
              >
                <span className="text-sm capitalize">{channel}</span>
                <Switch
                  checked={current.channels.includes(channel)}
                  disabled={disabled || !current.enabled}
                  onCheckedChange={(v) => toggleChannel(channel, v)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Auto-send — bypasses the human review queue, so it's called out. */}
        <div className="flex items-start justify-between gap-3 rounded-md border border-warning/20 bg-warning/5 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <Label className="text-sm">{t("dunningSettings.autoSend")}</Label>
              <p className="text-xs text-muted-foreground">{t("dunningSettings.autoSendDesc")}</p>
            </div>
          </div>
          <Switch
            checked={current.auto_send}
            disabled={disabled || !current.enabled}
            onCheckedChange={(v) => save({ auto_send: v })}
          />
        </div>

        {/* Message template */}
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("dunningSettings.template")}
          </Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("dunningSettings.subject")}
            disabled={disabled || !current.enabled}
            className="h-9"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            disabled={disabled || !current.enabled}
            className="text-sm"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">{t("dunningSettings.variables")}</span>
            {TEMPLATE_VARS.map((v) => (
              <code key={v} className="text-[11px] rounded bg-muted px-1.5 py-0.5 font-mono">{v}</code>
            ))}
          </div>
          {templateDirty && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                className="h-8"
                disabled={disabled}
                onClick={() => save({ subject, body })}
              >
                {update.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                {t("common.save")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                disabled={disabled}
                onClick={() => { setSubject(current.subject); setBody(current.body); }}
              >
                {t("common.cancel")}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
