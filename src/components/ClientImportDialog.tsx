import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
// xlsx is dynamically imported to avoid bundling issues

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ColumnMapping = Record<string, string>; // spreadsheet col -> our field

const OUR_FIELDS = ["company_name", "phone", "email", "address", "dot", "mc", "ein"] as const;
const REQUIRED_FIELDS = ["company_name", "phone", "email"] as const;

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

  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "done">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] });

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setProgress(0);
    setResults({ success: 0, errors: [] });
  };

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
          <div
            className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById("import-file-input")?.click()}
          >
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t("import.dragDrop")}</p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .csv</p>
            <input id="import-file-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleInput} />
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
