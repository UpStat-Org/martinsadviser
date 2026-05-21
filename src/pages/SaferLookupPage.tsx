import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Building2, Phone, MapPin, Hash, ShieldCheck, Users, Truck as TruckIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFmcsaLookup, type FmcsaResult } from "@/hooks/useFmcsaLookup";

const FIELDS: Array<{ key: keyof FmcsaResult; labelKey: string; icon: typeof Building2 }> = [
  { key: "company_name", labelKey: "safer.field.legalName", icon: Building2 },
  { key: "mc", labelKey: "safer.field.mc", icon: Hash },
  { key: "ein", labelKey: "safer.field.ein", icon: Hash },
  { key: "phone", labelKey: "safer.field.phone", icon: Phone },
  { key: "address", labelKey: "safer.field.address", icon: MapPin },
  { key: "totalPowerUnits", labelKey: "safer.field.totalPowerUnits", icon: TruckIcon },
  { key: "totalDrivers", labelKey: "safer.field.totalDrivers", icon: Users },
  { key: "carrierOperation", labelKey: "safer.field.carrierOperation", icon: ShieldCheck },
  { key: "safetyRating", labelKey: "safer.field.safetyRating", icon: ShieldCheck },
  { key: "statusCode", labelKey: "safer.field.statusCode", icon: ShieldCheck },
];

export default function SaferLookupPage() {
  const { t } = useLanguage();
  const { lookup, loading } = useFmcsaLookup();
  const [dot, setDot] = useState("");
  const [result, setResult] = useState<FmcsaResult | null>(null);
  const [notFoundDot, setNotFoundDot] = useState<string | null>(null);

  const onLookup = async () => {
    setNotFoundDot(null);
    setResult(null);
    const data = await lookup(dot);
    if (data) setResult(data);
    else setNotFoundDot(dot);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />
        <div className="relative">
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.2em] mb-2">FMCSA</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
            {t("safer.title")}
          </h1>
          <p className="text-white/70 mt-2 text-sm max-w-2xl">{t("safer.subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>{t("safer.dotLabel")}</Label>
              <Input
                value={dot}
                onChange={(e) => setDot(e.target.value.replace(/\D/g, ""))}
                placeholder="1234567"
                onKeyDown={(e) => e.key === "Enter" && onLookup()}
              />
            </div>
            <Button onClick={onLookup} disabled={!dot || loading} className="gap-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {t("safer.lookup")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {notFoundDot && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            {t("safer.notFound").replace("{dot}", notFoundDot)}
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELDS.map((f) => {
            const value = result[f.key];
            if (value == null || value === "" || value === 0) return null;
            const Icon = f.icon;
            return (
              <Card key={String(f.key)}>
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t(f.labelKey)}
                      </p>
                      <p className="font-display text-base font-bold mt-1 break-words">{String(value)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {result.safetyRating && (
            <Card className="md:col-span-2">
              <CardContent className="pt-5 flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={
                    result.safetyRating.toLowerCase() === "satisfactory"
                      ? "bg-success/10 text-success border-success/30"
                      : result.safetyRating.toLowerCase() === "conditional"
                      ? "bg-warning/10 text-warning border-warning/30"
                      : result.safetyRating.toLowerCase() === "unsatisfactory"
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : "border-border"
                  }
                >
                  {result.safetyRating}
                </Badge>
                <span className="text-xs text-muted-foreground">{t("safer.field.safetyRating")}</span>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
