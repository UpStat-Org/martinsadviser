import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { lookupCarrier, type FmcsaResult } from "@/hooks/useFmcsaLookup";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, Hash, Search } from "lucide-react";
// xlsx is dynamically imported to avoid bundling issues

interface DotRow {
  dot: string;
  result: FmcsaResult | null;
  selected: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ColumnMapping = Record<string, string>; // spreadsheet col -> our field

const OUR_FIELDS = ["company_name", "phone", "email", "address", "dot", "mc", "ein"] as const;
const REQUIRED_FIELDS = ["company_name"] as const;

const COLUMN_ALIASES: Record<string, string[]> = {
  company_name: ["name", "nome", "nombre", "company", "empresa", "company_name", "razao social", "razão social", "razon social", "company name", "nome da empresa"],
  phone: ["phone", "telefone", "tel", "teléfono", "telefono", "celular", "fone", "whatsapp"],
  email: ["email", "e-mail", "correo", "correo electrónico", "correo electronico"],
  address: ["address", "endereco", "endereço", "direccion", "dirección", "endereco completo", "endereço completo"],
  dot: ["dot", "dot#", "dot number", "dot #", "numero dot"],
  mc: ["mc", "mc#", "mc number", "mc #", "numero mc"],
  ein: ["ein", "ein#", "ein number", "ein #", "numero ein"],
};

function detectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const idx = normalizedHeaders.findIndex((h) => aliases.includes(h));
    if (idx !== -1) {
      mapping[headers[idx]] = field;
    }
  }
  return mapping;
}

export function ClientImportDialog({ open, onOpenChange }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"upload" | "mapping" | "dotPreview" | "importing" | "done">("upload");
  const [source, setSource] = useState<"file" | "dot">("file");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] });
  const [dotInput, setDotInput] = useState("");
  const [dotRows, setDotRows] = useState<DotRow[]>([]);

  const reset = () => {
    setStep("upload");
    setSource("file");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setProgress(0);
    setResults({ success: 0, errors: [] });
    setDotInput("");
    setDotRows([]);
  };

  // Parse free-form DOT input (newlines, commas, spaces) into unique numbers.
  const parseDots = (raw: string): string[] => {
    const seen = new Set<string>();
    for (const tok of raw.split(/[\s,;]+/)) {
      const d = tok.replace(/\D/g, "").trim();
      if (d) seen.add(d);
    }
    return [...seen];
  };

  const handleLookupDots = async () => {
    const dots = parseDots(dotInput);
    if (!dots.length) return;
    setStep("dotPreview");
    setDotRows(dots.map((dot) => ({ dot, result: null, selected: false })));
    setProgress(0);
    for (let i = 0; i < dots.length; i++) {
      const result = await lookupCarrier(dots[i]);
      setDotRows((prev) =>
        prev.map((r) => (r.dot === dots[i] ? { ...r, result, selected: !!result } : r)),
      );
      setProgress(Math.round(((i + 1) / dots.length) * 100));
    }
  };

  const handleImportDots = async () => {
    setStep("importing");
    setProgress(0);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const selected = dotRows.filter((r) => r.selected && r.result);
    let success = 0;
    const errors: string[] = [];
    for (let i = 0; i < selected.length; i++) {
      const r = selected[i].result!;
      const client: Record<string, any> = {
        user_id: user.id,
        status: "active",
        company_name: r.company_name || `DOT ${selected[i].dot}`,
        dot: r.dot,
        mc: r.mc || null,
        ein: r.ein || null,
        phone: r.phone || null,
        address: r.address || null,
      };
      const { error } = await supabase.from("clients").insert(client as any);
      if (error) errors.push(`DOT ${selected[i].dot}: ${error.message}`);
      else success++;
      setProgress(Math.round(((i + 1) / selected.length) * 100));
    }

    setResults({ success, errors });
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const dotLookupDone = dotRows.length > 0 && progress === 100;
  const dotSelectedCount = dotRows.filter((r) => r.selected && r.result).length;

  const handleFile = useCallback(async (file: File) => {
    const XLSX = await import("xlsx");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
        if (!json.length) {
          toast({ title: t("import.emptyFile"), variant: "destructive" });
          return;
        }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRows(json);
        setMapping(detectMapping(hdrs));
        setStep("mapping");
      } catch {
        toast({ title: t("import.parseError"), variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const mappedFields = Object.values(mapping);
  const missingRequired = REQUIRED_FIELDS.filter((f) => !mappedFields.includes(f));
  const canImport = missingRequired.length === 0;

  const handleImport = async () => {
    setStep("importing");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let success = 0;
    const errors: string[] = [];
    const reverseMapping: Record<string, string> = {};
    for (const [col, field] of Object.entries(mapping)) {
      reverseMapping[field] = col;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const client: Record<string, any> = { user_id: user.id, status: "active" };
      for (const field of OUR_FIELDS) {
        const col = reverseMapping[field];
        if (col && row[col]) {
          client[field] = String(row[col]).trim();
        }
      }

      if (!client.company_name) {
        errors.push(`${t("import.row")} ${i + 2}: ${t("import.missingName")}`);
        setProgress(Math.round(((i + 1) / rows.length) * 100));
        continue;
      }

      const { error } = await supabase.from("clients").insert(client as any);
      if (error) {
        errors.push(`${t("import.row")} ${i + 2}: ${error.message}`);
      } else {
        success++;
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    setResults({ success, errors });
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {t("import.title")}
          </DialogTitle>
          <DialogDescription>{t("import.subtitle")}</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            {/* Source toggle: spreadsheet vs FMCSA-by-DOT */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSource("file")}
                className={`flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold border transition-colors ${source === "file" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"}`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                {t("import.sourceFile")}
              </button>
              <button
                onClick={() => setSource("dot")}
                className={`flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold border transition-colors ${source === "dot" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"}`}
              >
                <Hash className="w-4 h-4" />
                {t("import.sourceDot")}
              </button>
            </div>

            {source === "file" ? (
              <div
                className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById("import-file-input")?.click()}
              >
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t("import.dragDrop")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("import.fileTypes")}</p>
                <input id="import-file-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleInput} />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("import.dotDesc")}</p>
                <Textarea
                  value={dotInput}
                  onChange={(e) => setDotInput(e.target.value)}
                  rows={6}
                  placeholder={"1234567\n7654321\n..."}
                  className="font-mono text-sm"
                />
                <Button onClick={handleLookupDots} disabled={!parseDots(dotInput).length} className="w-full">
                  <Search className="w-4 h-4 mr-2" />
                  {t("import.dotLookup")} ({parseDots(dotInput).length})
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "dotPreview" && (
          <div className="space-y-4">
            {!dotLookupDone && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-center text-muted-foreground">{t("import.dotLookingUp")}... {progress}%</p>
              </div>
            )}
            <div className="max-h-80 overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="text-xs">DOT</TableHead>
                    <TableHead className="text-xs">{t("import.field.company_name")}</TableHead>
                    <TableHead className="text-xs text-right">{t("import.dotUnitsDrivers")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dotRows.map((r) => (
                    <TableRow key={r.dot} className={!r.result ? "opacity-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={r.selected}
                          disabled={!r.result}
                          onCheckedChange={(v) =>
                            setDotRows((prev) => prev.map((x) => (x.dot === r.dot ? { ...x, selected: !!v } : x)))
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{r.dot}</TableCell>
                      <TableCell className="text-xs">
                        {r.result ? r.result.company_name || "—" : <span className="text-destructive">{t("import.dotNotFound")}</span>}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {r.result ? `${r.result.totalPowerUnits} / ${r.result.totalDrivers}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button onClick={handleImportDots} disabled={!dotLookupDone || dotSelectedCount === 0} className="w-full">
              {t("import.importButton")} {dotSelectedCount} {t("nav.clients").toLowerCase()}
            </Button>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("import.columnMapping")}</p>
              <p className="text-xs text-muted-foreground">{t("import.mappingDesc")}</p>
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="text-sm w-40 truncate font-mono">{header}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select
                    value={mapping[header] || "skip"}
                    onValueChange={(v) => setMapping((prev) => {
                      const next = { ...prev };
                      if (v === "skip") { delete next[header]; } else { next[header] = v; }
                      return next;
                    })}
                  >
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">{t("import.skip")}</SelectItem>
                      {OUR_FIELDS.map((f) => (
                        <SelectItem key={f} value={f} disabled={mappedFields.includes(f) && mapping[header] !== f}>
                          {t(`import.field.${f}`)}
                          {REQUIRED_FIELDS.includes(f as any) && " *"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {missingRequired.length > 0 && (
              <div className="text-sm text-destructive flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                {t("import.missingRequired")}: {missingRequired.map((f) => t(`import.field.${f}`)).join(", ")}
              </div>
            )}

            {/* Preview */}
            <div>
              <p className="text-sm font-medium mb-2">{t("import.preview")} ({rows.length} {t("import.rows")})</p>
              <div className="max-h-48 overflow-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.entries(mapping).map(([col, field]) => (
                        <TableHead key={col} className="text-xs">{t(`import.field.${field}`)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {Object.entries(mapping).map(([col, field]) => (
                          <TableCell key={col} className="text-xs">{row[col] || "—"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Button onClick={handleImport} disabled={!canImport} className="w-full">
              {t("import.importButton")} {rows.length} {t("nav.clients").toLowerCase()}
            </Button>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 py-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">{t("import.importing")}... {progress}%</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
              <div>
                <p className="font-medium">{t("import.complete")}</p>
                <p className="text-sm text-muted-foreground">
                  {results.success} {t("import.imported")}, {results.errors.length} {t("import.errorsCount")}
                </p>
              </div>
            </div>
            {results.errors.length > 0 && (
              <div className="max-h-32 overflow-auto text-xs space-y-1 bg-destructive/5 p-3 rounded">
                {results.errors.map((err, i) => (
                  <p key={i} className="text-destructive">{err}</p>
                ))}
              </div>
            )}
            <Button onClick={() => { reset(); onOpenChange(false); }} className="w-full">{t("documents.close")}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
