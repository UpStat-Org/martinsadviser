import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Plus, Building2, UserPlus, ShieldCheck } from "lucide-react";

// Shape returned by super_admin_list_orgs RPC.
interface OrgRow {
  id: string;
  slug: string;
  name: string;
  subscription_status: string;
  branding: Record<string, unknown>;
  feature_flags: Record<string, unknown>;
  created_at: string;
  member_count: number;
  client_count: number;
  permit_count: number;
  truck_count: number;
}

interface OrgDetails {
  org: {
    id: string;
    slug: string;
    name: string;
    branding: Record<string, unknown>;
    feature_flags: Record<string, unknown>;
    subscription_status: string;
    created_at: string;
    updated_at: string;
  };
  members: Array<{
    user_id: string;
    role: "owner" | "admin" | "member";
    approval_status: string;
    joined_at: string;
    email: string | null;
    full_name: string | null;
  }>;
}

const SUBSCRIPTION_OPTIONS = ["trialing", "active", "past_due", "canceled", "suspended"] as const;

function statusTone(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "trialing": return "secondary";
    case "past_due":
    case "suspended":
    case "canceled":
      return "destructive";
    default: return "outline";
  }
}

export default function SuperAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [openOrgId, setOpenOrgId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["super-admin-orgs"],
    queryFn: async (): Promise<OrgRow[]> => {
      const { data, error } = await supabase.rpc("super_admin_list_orgs");
      if (error) throw error;
      return (data ?? []) as OrgRow[];
    },
  });

  const refetchAll = () => qc.invalidateQueries({ queryKey: ["super-admin-orgs"] });

  return (
    <div className="space-y-6 py-6 px-4 lg:px-8 max-w-7xl mx-auto">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">
            <ShieldCheck className="w-3 h-3" />
            Super-admin
          </div>
          <h1 className="font-display text-2xl font-bold">Organizações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão cross-tenant de todas as orgs do sistema. Apenas owners da MartinsAdviser veem essa página.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Criar org
        </Button>
      </header>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {listQuery.isLoading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : listQuery.error ? (
            <div className="p-6 text-destructive text-sm">
              {(listQuery.error as Error).message}
            </div>
          ) : !listQuery.data?.length ? (
            <div className="p-10 text-sm text-muted-foreground text-center">
              Nenhuma organização ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Org</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">Permits</TableHead>
                  <TableHead className="text-right">Trucks</TableHead>
                  <TableHead>Criada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.data.map((org) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setOpenOrgId(org.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {org.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{org.slug}</TableCell>
                    <TableCell>
                      <Badge variant={statusTone(org.subscription_status)} className="capitalize">
                        {org.subscription_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{org.member_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{org.client_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{org.permit_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{org.truck_count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(org.created_at), "dd/MM/yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateOrgDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          refetchAll();
          toast({ title: "Organização criada" });
        }}
      />

      <OrgDetailsDrawer
        orgId={openOrgId}
        onClose={() => setOpenOrgId(null)}
        onChanged={refetchAll}
      />
    </div>
  );
}

// ============================================================================
// Create org dialog
// ============================================================================

function CreateOrgDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();

  const createOrg = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("super_admin_create_org", { p_slug: slug, p_name: name });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      setSlug(""); setName("");
      onOpenChange(false);
      onCreated();
    },
    onError: (e: any) => toast({ title: "Falha ao criar", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova organização</DialogTitle>
          <DialogDescription>
            Cria a tenant em status "trialing". Defina o owner em seguida pelo drawer de detalhes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="acme"
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Vira o subdomínio: <span className="font-mono">{slug || "&lt;slug&gt;"}.martinsadviser.com</span>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Nome</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Permit Services"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => createOrg.mutate()}
            disabled={!slug || !name || createOrg.isPending}
            className="gap-2"
          >
            {createOrg.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Details drawer
// ============================================================================

function OrgDetailsDrawer({
  orgId, onClose, onChanged,
}: { orgId: string | null; onClose: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const open = !!orgId;

  const detailsQuery = useQuery({
    queryKey: ["super-admin-org", orgId],
    queryFn: async (): Promise<OrgDetails> => {
      const { data, error } = await supabase.rpc("super_admin_org_details", { p_org_id: orgId });
      if (error) throw error;
      return data as OrgDetails;
    },
    enabled: !!orgId,
  });

  const details = detailsQuery.data;

  const [ownerEmail, setOwnerEmail] = useState("");
  const setOwner = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("super_admin_set_owner", { p_org_id: orgId, p_email: ownerEmail });
      if (error) throw error;
    },
    onSuccess: () => {
      setOwnerEmail("");
      detailsQuery.refetch();
      onChanged();
      toast({ title: "Owner definido" });
    },
    onError: (e: any) => toast({ title: "Falha", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.rpc("super_admin_update_org", {
        p_org_id: orgId,
        p_patch: { subscription_status: status },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      detailsQuery.refetch();
      onChanged();
      toast({ title: "Status atualizado" });
    },
    onError: (e: any) => toast({ title: "Falha", description: e.message, variant: "destructive" }),
  });

  const flagEntries = useMemo(() => {
    if (!details?.org.feature_flags) return [] as Array<[string, boolean]>;
    const f = details.org.feature_flags;
    return Object.entries(f).map(([k, v]) => [k, v === true] as [string, boolean]);
  }, [details?.org.feature_flags]);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{details?.org.name ?? "Carregando..."}</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {details?.org.slug}.martinsadviser.com
          </SheetDescription>
        </SheetHeader>

        {detailsQuery.isLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : detailsQuery.error ? (
          <p className="text-destructive text-sm py-6">{(detailsQuery.error as Error).message}</p>
        ) : !details ? null : (
          <div className="space-y-6 py-6">
            {/* Status */}
            <section className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select
                value={details.org.subscription_status}
                onValueChange={(v) => updateStatus.mutate(v)}
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            {/* Set owner */}
            <section className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Definir owner por email
              </Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="owner@empresa.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                />
                <Button
                  onClick={() => setOwner.mutate()}
                  disabled={!ownerEmail || setOwner.isPending}
                  className="gap-2 shrink-0"
                >
                  {setOwner.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Promover
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                O email precisa pertencer a um usuário já cadastrado no sistema.
              </p>
            </section>

            {/* Members */}
            <section className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Members</Label>
              {details.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem members aprovados ainda.</p>
              ) : (
                <div className="divide-y divide-border/50 border border-border/50 rounded-lg overflow-hidden">
                  {details.members.map((m) => (
                    <div key={m.user_id} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{m.full_name || m.email || m.user_id}</div>
                        {m.email && (
                          <div className="text-[11px] text-muted-foreground truncate">{m.email}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="capitalize">{m.role}</Badge>
                        {m.approval_status !== "approved" && (
                          <Badge variant="secondary" className="capitalize">{m.approval_status}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Feature flags snapshot */}
            <section className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Feature flags</Label>
              {flagEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Padrões (todos on).</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {flagEntries.map(([flag, on]) => (
                    <div
                      key={flag}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border border-border/50 text-xs"
                    >
                      <span className="font-mono">{flag}</span>
                      <span className={on ? "text-emerald-600" : "text-muted-foreground"}>
                        {on ? "on" : "off"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Pra editar, troque pra essa org via login no subdomínio e use Settings → Organização.
              </p>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
