import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Lock, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrg } from "@/contexts/OrgContext";
import {
  useComplianceAutomationSettings,
  useUpdateComplianceAutomation,
  COMPLIANCE_AUTOMATION_DEFAULTS,
  type ComplianceAutomationSettings,
} from "@/hooks/useComplianceAutomation";

const LEAD_OPTIONS = [15, 30, 45, 60, 90];

type Input = Omit<ComplianceAutomationSettings, "org_id" | "created_at" | "updated_at">;

export function ComplianceAutomationPanel() {
  const { t } = useLanguage();
  const { isOrgAdmin } = useOrg();
  const { data, isLoading } = useComplianceAutomationSettings();
  const update = useUpdateComplianceAutomation();

  const current: Input = useMemo(
    () => ({
      enabled: data?.enabled ?? COMPLIANCE_AUTOMATION_DEFAULTS.enabled,
      lead_days: data?.lead_days ?? COMPLIANCE_AUTOMATION_DEFAULTS.lead_days,
      ifta_enabled: data?.ifta_enabled ?? COMPLIANCE_AUTOMATION_DEFAULTS.ifta_enabled,
      kyu_enabled: data?.kyu_enabled ?? COMPLIANCE_AUTOMATION_DEFAULTS.kyu_enabled,
      nm_enabled: data?.nm_enabled ?? COMPLIANCE_AUTOMATION_DEFAULTS.nm_enabled,
      hvut_enabled: data?.hvut_enabled ?? COMPLIANCE_AUTOMATION_DEFAULTS.hvut_enabled,
      ucr_enabled: data?.ucr_enabled ?? COMPLIANCE_AUTOMATION_DEFAULTS.ucr_enabled,
      mcs150_enabled: data?.mcs150_enabled ?? COMPLIANCE_AUTOMATION_DEFAULTS.mcs150_enabled,
      notify: data?.notify ?? COMPLIANCE_AUTOMATION_DEFAULTS.notify,
    }),
    [data],
  );

  const save = (patch: Partial<Input>) => update.mutate({ ...current, ...patch });

  const categories: Array<{ key: keyof Input; label: string }> = [
    { key: "ifta_enabled", label: "IFTA" },
    { key: "kyu_enabled", label: "KYU" },
    { key: "nm_enabled", label: t("complianceCal.cat.nm") },
    { key: "hvut_enabled", label: "HVUT 2290" },
    { key: "ucr_enabled", label: "UCR" },
    { key: "mcs150_enabled", label: "MCS-150" },
  ];

  const disabled = !isOrgAdmin || update.isPending;

  return (
    <Card className="border-border/50 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border" />
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
              <Zap className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-base">{t("complianceAuto.title")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("complianceAuto.subtitle")}</p>
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
            {t("complianceAuto.adminOnly")}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">{t("complianceAuto.leadDays")}</Label>
          <Select
            value={String(current.lead_days)}
            onValueChange={(v) => save({ lead_days: Number(v) })}
            disabled={disabled || !current.enabled}
          >
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_OPTIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} {t("common.days")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("complianceAuto.categories")}
          </Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {categories.map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2"
              >
                <span className="text-sm">{c.label}</span>
                <Switch
                  checked={Boolean(current[c.key])}
                  disabled={disabled || !current.enabled}
                  onCheckedChange={(v) => save({ [c.key]: v } as Partial<Input>)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <Label className="text-sm">{t("complianceAuto.notify")}</Label>
            <p className="text-xs text-muted-foreground">{t("complianceAuto.notifyDesc")}</p>
          </div>
          <Switch
            checked={current.notify}
            disabled={disabled || !current.enabled}
            onCheckedChange={(v) => save({ notify: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
