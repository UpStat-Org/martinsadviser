import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Copy, Globe2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type OrgDomain = {
  id: string;
  organization_id: string;
  domain: string;
  verification_token: string;
  status: "pending" | "active" | "disabled";
  verified_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

function statusBadge(status: OrgDomain["status"], t: (key: string) => string) {
  if (status === "active") {
    return <Badge className="bg-success text-white hover:bg-success">{t("orgDomains.statusActive")}</Badge>;
  }
  if (status === "disabled") {
    return <Badge variant="secondary">{t("orgDomains.statusDisabled")}</Badge>;
  }
  return <Badge variant="outline">{t("orgDomains.statusPending")}</Badge>;
}

export function OrgDomainsPanel() {
  const { currentOrg, isOrgAdmin } = useOrg();
  const { toast } = useToast();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [domainInput, setDomainInput] = useState("");

  const normalized = useMemo(() => normalizeDomain(domainInput), [domainInput]);
  const inputError = useMemo(() => {
    if (!normalized) return null;
    if (!DOMAIN_REGEX.test(normalized)) return t("orgDomains.invalidDomain");
    if (normalized === "martinsadviser.com" || normalized.endsWith(".martinsadviser.com")) {
      return t("orgDomains.platformDomainError");
    }
    return null;
  }, [normalized, t]);

  const domainsQuery = useQuery({
    queryKey: ["org-domains", currentOrg?.id],
    queryFn: async (): Promise<OrgDomain[]> => {
      if (!currentOrg) return [];
      const { data, error } = await (supabase as any)
        .from("organization_domains")
        .select("id, organization_id, domain, verification_token, status, verified_at, last_checked_at, created_at, updated_at")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrgDomain[];
    },
    enabled: !!currentOrg && isOrgAdmin,
  });

  const addDomain = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error("No active organization");
      if (!normalized || inputError) throw new Error(inputError ?? t("orgDomains.enterValidDomain"));
      const { error } = await (supabase as any).rpc("request_org_domain", {
        p_org_id: currentOrg.id,
        p_domain: normalized,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setDomainInput("");
      await qc.invalidateQueries({ queryKey: ["org-domains", currentOrg?.id] });
      toast({ title: t("orgDomains.added"), description: t("orgDomains.addedDesc") });
    },
    onError: (e: any) => {
      toast({ title: t("orgDomains.addFailed"), description: e.message, variant: "destructive" });
    },
  });

  const verifyDomain = useMutation({
    mutationFn: async (domain: OrgDomain) => {
      if (!currentOrg) throw new Error("No active organization");
      const { data, error } = await supabase.functions.invoke("verify-domain", {
        body: { org_id: currentOrg.id, domain_id: domain.id },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { verified: boolean; records?: string[] };
    },
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["org-domains", currentOrg?.id] });
      toast({
        title: data.verified ? t("orgDomains.verified") : t("orgDomains.txtNotFound"),
        description: data.verified
          ? t("orgDomains.verifiedDesc")
          : t("orgDomains.txtNotFoundDesc"),
        variant: data.verified ? "default" : "destructive",
      });
    },
    onError: (e: any) => {
      toast({ title: t("orgDomains.verifyFailed"), description: e.message, variant: "destructive" });
    },
  });

  const removeDomain = useMutation({
    mutationFn: async (domain: OrgDomain) => {
      const { error } = await (supabase as any)
        .from("organization_domains")
        .delete()
        .eq("id", domain.id)
        .eq("organization_id", domain.organization_id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["org-domains", currentOrg?.id] });
      toast({ title: t("orgDomains.removed") });
    },
    onError: (e: any) => {
      toast({ title: t("orgDomains.removeFailed"), description: e.message, variant: "destructive" });
    },
  });

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: t("orgDomains.copied") });
  };

  if (!currentOrg || !isOrgAdmin) return null;

  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center shrink-0">
            <Globe2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t("orgDomains.title")}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t("orgDomains.description")}
            </p>
          </div>
        </div>

        <form
          className="grid gap-3 sm:grid-cols-[1fr_auto] items-end"
          onSubmit={(e) => {
            e.preventDefault();
            addDomain.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="custom-domain">{t("orgDomains.domainLabel")}</Label>
            <Input
              id="custom-domain"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder={t("orgDomains.placeholder")}
              className="font-mono"
            />
            <p className={`text-[11px] ${inputError ? "text-destructive" : "text-muted-foreground"}`}>
              {inputError ?? t("orgDomains.domainHint")}
            </p>
          </div>
          <Button type="submit" disabled={!normalized || !!inputError || addDomain.isPending} className="gap-2">
            {addDomain.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe2 className="w-4 h-4" />}
            {t("common.add")}
          </Button>
        </form>

        <div className="rounded-md border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">{t("orgDomains.dnsRequired")}</p>
          <p>{t("orgDomains.dnsStepTxt")}</p>
          <p>{t("orgDomains.dnsStepCname")}</p>
        </div>

        <div className="space-y-3">
          {domainsQuery.isLoading && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("orgDomains.loading")}
            </div>
          )}

          {!domainsQuery.isLoading && (domainsQuery.data?.length ?? 0) === 0 && (
            <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground text-center">
              {t("orgDomains.empty")}
            </div>
          )}

          {domainsQuery.data?.map((domain) => {
            const txtName = `_martinsadviser.${domain.domain}`;
            const verifying = verifyDomain.isPending;

            return (
              <div key={domain.id} className="rounded-md border border-border/50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {domain.status === "active" ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                    )}
                    <span className="font-mono text-sm font-semibold truncate">{domain.domain}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(domain.status, t)}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => verifyDomain.mutate(domain)}
                      disabled={verifying}
                      className="gap-1.5"
                    >
                      {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      {t("orgDomains.verify")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDomain.mutate(domain)}
                      disabled={removeDomain.isPending}
                      title={t("orgDomains.remove")}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 text-xs">
                  <DnsRow label={t("orgDomains.txtName")} value={txtName} copyLabel={t("orgDomains.copy")} onCopy={() => copy(txtName)} />
                  <DnsRow label={t("orgDomains.txtValue")} value={domain.verification_token} copyLabel={t("orgDomains.copy")} onCopy={() => copy(domain.verification_token)} />
                  <DnsRow label={t("orgDomains.appHost")} value="martinsadviser.com" copyLabel={t("orgDomains.copy")} onCopy={() => copy("martinsadviser.com")} />
                </div>

                <p className="text-[11px] text-muted-foreground">
                  {domain.last_checked_at
                    ? `${t("orgDomains.lastChecked")}: ${new Date(domain.last_checked_at).toLocaleString()}`
                    : t("orgDomains.notChecked")}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DnsRow({ label, value, copyLabel, onCopy }: { label: string; value: string; copyLabel: string; onCopy: () => void }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[96px_1fr_auto] sm:items-center rounded-md bg-background border border-border/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <code className="font-mono text-[11px] break-all">{value}</code>
      <Button type="button" variant="ghost" size="icon" onClick={onCopy} className="h-7 w-7 justify-self-end" title={copyLabel}>
        <Copy className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
