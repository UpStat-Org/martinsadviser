import { Link, useNavigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import { useState } from "react";
import { ArrowLeft, Building2, CalendarDays, FileCheck, FileText, Hash, History, Pencil, Receipt, Truck } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getExpirationStatus, usePermit } from "@/hooks/usePermits";
import { usePermitDocuments } from "@/hooks/usePermitDocuments";
import { usePermitHistory } from "@/hooks/usePermitHistory";
import { useActivityLog } from "@/hooks/useActivityLog";
import { CommentsSection } from "@/components/CommentsSection";
import { PermitFormDialog } from "@/components/PermitFormDialog";
import { DocumentViewer } from "@/components/DocumentViewer";

export default function PermitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const { data: permit, isLoading } = usePermit(id);
  const { data: documents } = usePermitDocuments(id);
  const { data: history } = usePermitHistory(id);
  const { data: activity } = useActivityLog(permit?.client_id, 8);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!permit) return null;

  const status = getExpirationStatus(permit.expiration_date);
  const daysToExpiration = permit.expiration_date
    ? Math.ceil((new Date(permit.expiration_date).getTime() - Date.now()) / 86400000)
    : null;
  const currentDoc = documents?.find((doc) => doc.is_current) || documents?.[0];
  const documentUrl = currentDoc?.document_url || permit.document_url;

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">{permit.permit_type}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {permit.permit_number || "Sem número"} {permit.state ? `• ${permit.state}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={status.color}>{status.label}</Badge>
            <button
              onClick={() => setEditOpen(true)}
              className="h-9 px-3 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold inline-flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Editar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusTile label="Status operacional" value={status.label} tone={daysToExpiration !== null && daysToExpiration <= 30 ? "red" : "emerald"} />
        <StatusTile label="Dias para vencimento" value={daysToExpiration === null ? "Sem data" : String(daysToExpiration)} tone={daysToExpiration !== null && daysToExpiration <= 30 ? "amber" : "muted"} />
        <StatusTile label="Versões de documento" value={String(documents?.length ?? (permit.document_url ? 1 : 0))} tone={documentUrl ? "emerald" : "muted"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dados do permit</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info label="Cliente" value={permit.clients?.company_name || "—"} to={`/clients/${permit.client_id}`} icon={<Building2 className="w-4 h-4" />} />
            <Info label="Caminhão" value={permit.trucks?.plate || "—"} to={permit.truck_id ? `/trucks/${permit.truck_id}` : undefined} icon={<Truck className="w-4 h-4" />} />
            <Info label="Número" value={permit.permit_number || "—"} icon={<Hash className="w-4 h-4" />} />
            <Info
              label="Vencimento"
              value={permit.expiration_date ? format(new Date(permit.expiration_date), "dd/MM/yyyy") : "—"}
              icon={<CalendarDays className="w-4 h-4" />}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link className="block h-10 px-3 rounded-xl bg-muted/60 hover:bg-muted text-sm font-semibold leading-10" to={`/clients/${permit.client_id}`}>
              Abrir cliente
            </Link>
            {permit.truck_id && (
              <Link className="block h-10 px-3 rounded-xl bg-muted/60 hover:bg-muted text-sm font-semibold leading-10" to={`/trucks/${permit.truck_id}`}>
                Abrir caminhão
              </Link>
            )}
            {permit.document_url && (
              <button className="block w-full h-10 px-3 rounded-xl bg-muted/60 hover:bg-muted text-sm font-semibold leading-10 text-left" onClick={() => setDocOpen(true)}>
                Abrir documento
              </button>
            )}
            <Link className="block h-10 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold leading-10" to={`/finance?action=new&client=${permit.client_id}`}>
              <Receipt className="inline w-4 h-4 mr-2" />
              Nova invoice do cliente
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {documentUrl ? (
              <>
                <button
                  onClick={() => setDocOpen(true)}
                  className="w-full rounded-xl border border-border/50 p-3 text-left hover:bg-muted/40"
                >
                  <div className="text-sm font-semibold">{currentDoc?.file_name || `${permit.permit_type} documento`}</div>
                  <div className="text-xs text-muted-foreground">
                    {documents?.length ? `${documents.length} versão(ões)` : "Documento atual"}
                  </div>
                </button>
                {documents?.slice(0, 4).map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/50 p-3 hover:bg-muted"
                  >
                    <span className="text-sm font-semibold">v{doc.version}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "dd/MM/yyyy")}</span>
                  </a>
                ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum documento registrado para este permit.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history?.length ? (
              history.slice(0, 5).map((entry) => (
                <div key={entry.id} className="rounded-xl bg-muted/40 border border-border/50 p-3">
                  <div className="text-sm font-semibold">{entry.change_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm")}
                  </div>
                  {entry.notes && <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum histórico registrado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {permit.notes || "Nenhuma observação registrada."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activity?.length ? (
              activity.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl bg-muted/40 border border-border/50 p-3">
                  <div className="text-sm font-semibold">{item.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <CommentsSection entityType="permit" entityId={permit.id} />

      <PermitFormDialog open={editOpen} onOpenChange={setEditOpen} permit={permit} />
      {documentUrl && (
        <DocumentViewer
          open={docOpen}
          onOpenChange={setDocOpen}
          url={documentUrl}
          title={`${permit.permit_type} ${permit.permit_number || ""}`}
          versions={documents}
        />
      )}
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "red" | "muted";
}) {
  const toneClass = {
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    red: "bg-red-500/10 text-red-600 border-red-500/20",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Info({
  label,
  value,
  icon,
  to,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  to?: string;
}) {
  const content = (
    <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {icon}
        {label}
      </div>
      <div className="font-semibold">{value}</div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}
