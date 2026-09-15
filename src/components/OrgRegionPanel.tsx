import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Globe, Loader2, Lock, AlertTriangle } from "lucide-react";
import { errorMessage } from "@/lib/utils";
import {
  COUNTRIES, CURRENCIES, CURRENCY_SYMBOL,
  defaultCurrencyForCountry, defaultLocaleForCountry,
  isCountryCode, isCurrency,
  type CountryCode, type Currency,
} from "@/lib/region";
import { languageLabels, type Language } from "@/lib/translations";

const COUNTRY_FLAG: Record<CountryCode, string> = { US: "🇺🇸", BR: "🇧🇷", ES: "🇪🇸" };
const LANGUAGES: Language[] = ["en", "pt", "es"];

/**
 * País, moeda e idioma da organização.
 *
 * Os três ficam no mesmo painel porque são escolhidos juntos e um sugere os
 * outros — mas são gravados de forma independente, porque a combinação óbvia
 * nem sempre é a certa. Uma assessoria americana que atende frota brasileira
 * quer país US (é FMCSA que ela declara) com idioma pt. Por isso o painel
 * *sugere* o default do país e deixa o admin sobrescrever, em vez de forçar.
 *
 * Escrito pela RPC update_org_regional_settings, não por UPDATE direto: a
 * policy de organizations é owner-only e cobre a tabela inteira — abri-la pra
 * admins entregaria feature_flags e subscription_status junto. Mesmo padrão de
 * OrgBrandingPanel e OrgHourlyRatePanel.
 */
export function OrgRegionPanel() {
  const { currentOrg, isOrgAdmin, refresh } = useOrg();
  const { t } = useLanguage();
  const { toast } = useToast();

  const storedCountry: CountryCode = isCountryCode(currentOrg?.country) ? currentOrg.country : "US";
  const storedCurrency: Currency = isCurrency(currentOrg?.currency)
    ? currentOrg.currency
    : defaultCurrencyForCountry(storedCountry);
  const storedLocale = (currentOrg?.locale ?? defaultLocaleForCountry(storedCountry)) as Language;

  const [country, setCountry] = useState<CountryCode>(storedCountry);
  const [currency, setCurrency] = useState<Currency>(storedCurrency);
  const [locale, setLocale] = useState<Language>(storedLocale);

  // Re-semeia quando a org carrega ou o usuário troca de tenant.
  useEffect(() => {
    setCountry(storedCountry);
    setCurrency(storedCurrency);
    setLocale(storedLocale);
  }, [storedCountry, storedCurrency, storedLocale]);

  const suggestedCurrency = defaultCurrencyForCountry(country);
  const suggestedLocale = defaultLocaleForCountry(country);
  const matchesSuggestion = currency === suggestedCurrency && locale === suggestedLocale;

  const save = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error("No active organization");
      // Cast porque a RPC é posterior à última geração de types.ts — mesmo
      // motivo pelo qual OrgHourlyRatePanel e OrgBrandingPanel fazem cast.
      const rpc = supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
      const { error } = await rpc("update_org_regional_settings", {
        p_org_id: currentOrg.id,
        p_country: country,
        p_currency: currency,
        p_locale: locale,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await refresh();
      toast({ title: t("orgRegion.saved") });
    },
    onError: (e: unknown) =>
      toast({ title: t("orgRegion.saveFailed"), description: errorMessage(e), variant: "destructive" }),
  });

  if (!currentOrg) return null;

  if (!isOrgAdmin) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="text-sm">{t("orgRegion.adminOnly")}</span>
        </CardContent>
      </Card>
    );
  }

  const countryChanged = country !== storedCountry;
  const unchanged =
    country === storedCountry && currency === storedCurrency && locale === storedLocale;

  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t("orgRegion.title")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("orgRegion.desc")}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="org-country" className="text-xs">{t("orgRegion.country")}</Label>
            <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
              <SelectTrigger id="org-country"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {COUNTRY_FLAG[c]} {t(`country.${c.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground leading-snug">{t("orgRegion.countryHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-currency" className="text-xs">{t("orgRegion.currency")}</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger id="org-currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{CURRENCY_SYMBOL[c]} {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground leading-snug">{t("orgRegion.currencyHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-locale" className="text-xs">{t("orgRegion.locale")}</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as Language)}>
              <SelectTrigger id="org-locale"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {languageLabels[l].flag} {languageLabels[l].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground leading-snug">{t("orgRegion.localeHint")}</p>
          </div>
        </div>

        {!matchesSuggestion && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {t("orgRegion.suggested")
                .replace("{currency}", suggestedCurrency)
                .replace("{locale}", languageLabels[suggestedLocale].label)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setCurrency(suggestedCurrency); setLocale(suggestedLocale); }}
            >
              {t("orgRegion.applySuggested")}
            </Button>
          </div>
        )}

        {countryChanged && (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
            <span className="text-xs text-warning-foreground/90">{t("orgRegion.countryWarning")}</span>
          </div>
        )}

        <Button
          onClick={() => save.mutate()}
          disabled={unchanged || save.isPending}
          className="gap-2"
        >
          {save.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t("common.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
