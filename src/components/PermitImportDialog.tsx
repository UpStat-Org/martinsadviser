import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ColumnMapping = Record<string, string>;

const OUR_FIELDS = ["permit_type", "permit_number", "state", "expiration_date", "client_dot", "client_name", "truck_plate", "status"] as const;
const REQUIRED_FIELDS = ["permit_type"] as const;

const COLUMN_ALIASES: Record<string, string[]> = {
  permit_type: ["permit_type", "tipo", "type", "tipo de permit", "permit type", "tipo permit"],
  permit_number: ["permit_number", "numero", "number", "número", "nº", "permit number", "numero permit"],
  state: ["state", "estado", "uf", "st"],
  expiration_date: ["expiration_date", "expiration", "vencimento", "validade", "expiry", "data vencimento", "exp date"],
  client_dot: ["client_dot", "dot", "dot#", "dot number", "dot #", "numero dot"],
  client_name: ["client_name", "client", "cliente", "empresa", "company", "company_name", "nome da empresa"],
  truck_plate: ["truck_plate", "plate", "placa", "truck", "caminhao", "caminhão"],
  status: ["status", "situacao", "situação"],
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

export function PermitImportDialog({ open, onOpenChange }: Props) {
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
          toast({ title: "Arquivo vazio", variant: "destructive" });
          return;
        }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRows(json);
        setMapping(detectMapping(hdrs));
        setStep("mapping");
      } catch {
        toast({ title: "Erro ao ler arquivo", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

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

  const FIELD_LABELS: Record<string, string> = {
    permit_type: "Tipo *",
    permit_number: "Número",
    state: "Estado",
    expiration_date: "Vencimento",
    client_dot: "DOT do Cliente",
    client_name: "Nome do Cliente",
    truck_plate: "Placa do Caminhão",
    status: "Status",
  };

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

    // Cache for client lookups
    const clientCache: Record<string, string | null> = {};
    const truckCache: Record<string, string | null> = {};

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const getValue = (field: string) => {
        const col = reverseMapping[field];
        return col && row[col] ? String(row[col]).trim() : "";
      };

      const permitType = getValue("permit_type");
      if (!permitType) {
        errors.push(`Linha ${i + 2}: Tipo do permit é obrigatório`);
        setProgress(Math.round(((i + 1) / rows.length) * 100));
        continue;
      }

      // Resolve client_id
      let clientId: string | null = null;
      const clientDot = getValue("client_dot");
      const clientName = getValue("client_name");

      if (clientDot) {
        if (clientCache[`dot:${clientDot}`] !== undefined) {
          clientId = clientCache[`dot:${clientDot}`];
        } else {
          const { data } = await supabase.from("clients").select("id").eq("dot", clientDot).limit(1);
          clientId = data?.[0]?.id || null;
          clientCache[`dot:${clientDot}`] = clientId;
        }
      }

      if (!clientId && clientName) {
        if (clientCache[`name:${clientName}`] !== undefined) {
          clientId = clientCache[`name:${clientName}`];
        } else {
          const { data } = await supabase.from("clients").select("id").ilike("company_name", clientName).limit(1);
          clientId = data?.[0]?.id || null;
          clientCache[`name:${clientName}`] = clientId;
        }
      }

      if (!clientId && (clientDot || clientName)) {
        errors.push(`Linha ${i + 2}: Cliente não encontrado (DOT: ${clientDot || "—"}, Nome: ${clientName || "—"})`);
        setProgress(Math.round(((i + 1) / rows.length) * 100));
        continue;
      }

      // Resolve truck_id
      let truckId: string | null = null;
      const truckPlate = getValue("truck_plate");
      if (truckPlate && clientId) {
        const cacheKey = `${clientId}:${truckPlate}`;
        if (truckCache[cacheKey] !== undefined) {
          truckId = truckCache[cacheKey];
        } else {
          const { data } = await supabase.from("trucks").select("id").eq("client_id", clientId).ilike("plate", truckPlate).limit(1);
          truckId = data?.[0]?.id || null;
          truckCache[cacheKey] = truckId;
        }
      }

      const permit: Record<string, any> = {
        user_id: user.id,
        permit_type: permitType,
        status: getValue("status") || "active",
      };

      if (clientId) permit.client_id = clientId;
      if (truckId) permit.truck_id = truckId;
      if (getValue("permit_number")) permit.permit_number = getValue("permit_number");
      if (getValue("state")) permit.state = getValue("state");
      if (getValue("expiration_date")) permit.expiration_date = getValue("expiration_date");

      const { error } = await supabase.from("permits").insert(permit as any);
      if (error) {
        errors.push(`Linha ${i + 2}: ${error.message}`);
      } else {
        success++;
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    setResults({ success, errors });
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["permits"] });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Permits
          </DialogTitle>
          <DialogDescription>Importe permits de uma planilha CSV ou Excel</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById("permit-import-file-input")?.click()}
          >
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Arraste uma planilha ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .csv</p>
            <input id="permit-import-file-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleInput} />
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Mapeamento de Colunas</p>
              <p className="text-xs text-muted-foreground">Associe as colunas da planilha aos campos do sistema</p>
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
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Pular</SelectItem>
                      {OUR_FIELDS.map((f) => (
                        <SelectItem key={f} value={f} disabled={mappedFields.includes(f) && mapping[header] !== f}>
                          {FIELD_LABELS[f] || f}
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
                Campos obrigatórios faltando: {missingRequired.map((f) => FIELD_LABELS[f] || f).join(", ")}
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Preview ({rows.length} linhas)</p>
              <div className="max-h-48 overflow-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.entries(mapping).map(([col, field]) => (
                        <TableHead key={col} className="text-xs">{FIELD_LABELS[field] || field}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {Object.entries(mapping).map(([col]) => (
                          <TableCell key={col} className="text-xs">{row[col] || "—"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Button onClick={handleImport} disabled={!canImport} className="w-full">
              Importar {rows.length} permits
            </Button>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 py-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">Importando... {progress}%</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
              <div>
                <p className="font-medium">Importação concluída</p>
                <p className="text-sm text-muted-foreground">
                  {results.success} importados, {results.errors.length} erros
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
            <Button onClick={() => { reset(); onOpenChange(false); }} className="w-full">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
