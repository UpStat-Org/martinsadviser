import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Trash2, Fuel, Upload } from "lucide-react";
import { tNow } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { quarterFromDate } from "@/lib/ifta";

const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    upsert: (row: unknown, opts?: unknown) => any;
    delete: () => any;
  };
};

interface IftaRateRow {
  id: string;
  org_id: string;
  quarter: string;
  jurisdiction: string;
  rate_per_gallon: number;
  created_at: string;
}

// Lower-48 US states + DC + 10 Canadian provinces — the full IFTA membership.
const ALL_JURISDICTIONS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA",
  "MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD",
  "TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
  "AB","BC","MB","NB","NL","NS","ON","PE","QC","SK",
];

const availableQuarters = (() => {
  const list: string[] = [];
  const now = new Date();
  for (let i = -4; i <= 2; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i * 3, 1));
    list.push(quarterFromDate(d));
  }
  return Array.from(new Set(list));
})();

export default function IftaRatesAdminPage() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [quarter, setQuarter] = useState(quarterFromDate(new Date()));
  const [bulkText, setBulkText] = useState("");

  const { data: rates } = useQuery({
    queryKey: ["ifta_rates_admin", quarter, currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data, error } = await db
        .from("ifta_tax_rates")
        .select("*")
        .eq("quarter", quarter)
        .order("jurisdiction");
      if (error) throw new Error(error.message);
      return (data ?? []) as IftaRateRow[];
    },
  });

  const rateByJ = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rates ?? []) m.set(r.jurisdiction, Number(r.rate_per_gallon));
    return m;
  }, [rates]);

  const [draft, setDraft] = useState<Record<string, string>>({});

  const upsertMut = useMutation({
    mutationFn: async (rows: { jurisdiction: string; rate_per_gallon: number }[]) => {
      if (!user || !currentOrg) throw new Error(tNow("iftaRates.noOrgUser"));
      const payload = rows.map((r) => ({
        org_id: currentOrg.id,
        quarter,
        jurisdiction: r.jurisdiction.toUpperCase(),
        rate_per_gallon: r.rate_per_gallon,
      }));
      const { error } = await db
        .from("ifta_tax_rates")
        .upsert(payload, { onConflict: "org_id,quarter,jurisdiction" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ifta_rates_admin"] });
      queryClient.invalidateQueries({ queryKey: ["ifta_rates"] });
      setDraft({});
      toast({ title: t("iftaRates.saved") });
    },
    onError: (e: Error) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("ifta_tax_rates").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ifta_rates_admin"] }),
  });

  const saveDraft = async () => {
    const rows = Object.entries(draft)
      .map(([j, v]) => ({ jurisdiction: j, rate_per_gallon: parseFloat(v) }))
      .filter((r) => Number.isFinite(r.rate_per_gallon) && r.rate_per_gallon > 0);
    if (!rows.length) return;
    await upsertMut.mutateAsync(rows);
  };

  // Paste from official IFTA rate sheet: each line is "TX 0.20" or "TX,0.20"
  // or "TX\t0.20". We accept any whitespace/comma separator and uppercase the
  // code so users can copy from various sources.
  const parseAndStageBulk = () => {
    const next: Record<string, string> = {};
    for (const line of bulkText.split(/\r?\n/)) {
      const m = line.trim().match(/^([A-Za-z]{2})[\s,;]+([0-9]*\.?[0-9]+)/);
      if (!m) continue;
      next[m[1].toUpperCase()] = m[2];
    }
    setDraft((d) => ({ ...d, ...next }));
    setBulkText("");
    toast({ title: t("iftaRates.bulkLoaded").replace("{count}", String(Object.keys(next).length)) });
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">
        <div className="relative">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2">
            {t("iftaRates.section")}
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
            {t("iftaRates.title")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
            {t("iftaRates.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t("iftaRates.quarter")}</Label>
          <Select value={quarter} onValueChange={(v) => { setQuarter(v); setDraft({}); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableQuarters.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("iftaRates.bulkLabel")}</Label>
          <div className="flex gap-2">
            <Input
              placeholder={t("iftaRates.bulkPlaceholder")}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <Button variant="outline" onClick={parseAndStageBulk} disabled={!bulkText.trim()}>
              <Upload className="w-3.5 h-3.5 mr-1" />
              {t("iftaRates.bulkLoad")}
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              {t("iftaRates.title2").replace("{quarter}", quarter)}
            </CardTitle>
            <Button
              size="sm"
              onClick={saveDraft}
              disabled={Object.keys(draft).length === 0 || upsertMut.isPending}
              className="gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {t("iftaRates.save").replace("{count}", String(Object.keys(draft).length || ""))}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("ifta.col.juris")}</TableHead>
                <TableHead>{t("iftaRates.currentRate")}</TableHead>
                <TableHead>{t("iftaRates.newRate")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ALL_JURISDICTIONS.map((j) => {
                const current = rateByJ.get(j);
                const existing = (rates ?? []).find((r) => r.jurisdiction === j);
                return (
                  <TableRow key={j}>
                    <TableCell className="font-mono font-semibold">{j}</TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {current !== undefined ? current.toFixed(5) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder={current !== undefined ? current.toString() : "0.0000"}
                        value={draft[j] ?? ""}
                        onChange={(e) => setDraft({ ...draft, [j]: e.target.value })}
                        className="h-8 max-w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      {existing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMut.mutate(existing.id)}
                          title={t("iftaRates.remove")}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
