import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Copy, Loader2, Lock, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// Lists the org's members and pending invitations, plus the invite form.
// Lives in Settings → Organização and shows up only for owners/admins.

interface Member {
  user_id: string;
  role: "owner" | "admin" | "member";
  approval_status: string;
  joined_at: string;
  email: string | null;
  full_name: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export function OrgMembersPanel() {
  const { currentOrg, isOrgAdmin } = useOrg();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");

  // Members come from the list_org_members RPC because direct SELECT on
  // profiles is locked to your own row by RLS — the RPC is SECURITY DEFINER
  // and validates is_org_member(p_org_id) inline.
  const membersQuery = useQuery({
    queryKey: ["org-members", currentOrg?.id],
    enabled: !!currentOrg && isOrgAdmin,
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase.rpc("list_org_members", { p_org_id: currentOrg!.id });
      if (error) throw error;
      return (data as Member[]) ?? [];
    },
  });

  const invitationsQuery = useQuery({
    queryKey: ["org-invitations", currentOrg?.id],
    enabled: !!currentOrg && isOrgAdmin,
    queryFn: async (): Promise<Invitation[]> => {
      const { data, error } = await supabase
        .from("organization_invitations")
        .select("id, email, role, token, expires_at, accepted_at, created_at")
        .eq("organization_id", currentOrg!.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invitation[];
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error("no org");
      const { data, error } = await supabase.rpc("invite_member", {
        p_org_id: currentOrg.id,
        p_email: email,
        p_role: role,
      });
      if (error) throw error;
      const invitation = data as { id: string; token: string; expires_at: string };
      // Fire-and-forget the email send: if Resend is misconfigured or down,
      // the invitation still exists and the owner can copy the link from
      // the panel. Surface failure as a soft warning instead of blocking.
      const { error: emailErr } = await supabase.functions.invoke("send-invitation-email", {
        body: { invitation_id: invitation.id },
      });
      return { invitation, emailErr: emailErr?.message ?? null };
    },
    onSuccess: ({ emailErr }) => {
      setEmail("");
      setRole("member");
      qc.invalidateQueries({ queryKey: ["org-invitations", currentOrg?.id] });
      if (emailErr) {
        toast({
          title: "Convite criado — email falhou",
          description: `Convite gerado, mas o email não pôde ser enviado (${emailErr}). Copie o link e envie manualmente.`,
          variant: "destructive",
        });
      } else {
        toast({ title: t("orgMembers.inviteSent") });
      }
    },
    onError: (e: any) => toast({ title: t("orgMembers.inviteFailed"), description: e.message, variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("revoke_invitation", { p_invitation_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-invitations", currentOrg?.id] });
      toast({ title: "Convite revogado" });
    },
    onError: (e: any) => toast({ title: "Falha ao revogar", description: e.message, variant: "destructive" }),
  });

  // The invite URL the owner copies. Always built off the current host so
  // it works whether the operator is on the apex or a tenant subdomain.
  const inviteUrl = (token: string) =>
    typeof window === "undefined" ? "" : `${window.location.origin}/invite/${token}`;

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast({ title: t("orgMembers.linkCopied") });
    } catch {
      toast({ title: t("orgMembers.copyFailed"), variant: "destructive" });
    }
  };

  const memberSorted = useMemo(() => {
    const order = { owner: 0, admin: 1, member: 2 } as Record<string, number>;
    return [...(membersQuery.data ?? [])].sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9));
  }, [membersQuery.data]);

  if (!currentOrg) return null;

  if (!isOrgAdmin) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="text-sm">{t("orgMembers.ownerOnly")}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t("orgMembers.heading")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("orgMembers.headingHint")}
          </p>
        </div>

        {/* Invite form */}
        <form
          className="grid sm:grid-cols-[1fr_140px_auto] gap-2"
          onSubmit={(e) => { e.preventDefault(); invite.mutate(); }}
        >
          <div className="space-y-1">
            <Label htmlFor="invite-email" className="sr-only">{t("common.email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("orgMembers.inviteEmailPlaceholder")}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={role} onValueChange={(v) => setRole(v as "member" | "admin")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">{t("orgMembers.roleMember")}</SelectItem>
              <SelectItem value="admin">{t("orgMembers.roleAdmin")}</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={!email || invite.isPending} className="gap-2">
            {invite.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            {t("orgMembers.invite")}
          </Button>
        </form>

        {/* Pending invitations */}
        {!!invitationsQuery.data?.length && (
          <section className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("orgMembers.pendingInvites")} ({invitationsQuery.data.length})
            </Label>
            <div className="divide-y divide-border/50 border border-border/50 rounded-lg overflow-hidden">
              {invitationsQuery.data.map((inv) => {
                const expired = new Date(inv.expires_at) < new Date();
                return (
                  <div key={inv.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{inv.email}</div>
                      <div className="text-[11px] text-muted-foreground truncate font-mono">
                        {inviteUrl(inv.token)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="capitalize">{inv.role}</Badge>
                      {expired ? (
                        <Badge variant="destructive">{t("orgMembers.invitedExpired")}</Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {t("orgMembers.expiresAt")} {format(new Date(inv.expires_at), "dd/MM")}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={t("orgMembers.copyLink")}
                        onClick={() => copyLink(inv.token)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={t("orgMembers.revoke")}
                        onClick={() => revoke.mutate(inv.id)}
                        disabled={revoke.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Existing members */}
        <section className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("orgMembers.members")} ({memberSorted.length})
          </Label>
          {membersQuery.isLoading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : !memberSorted.length ? (
            <p className="text-sm text-muted-foreground">{t("orgMembers.noMembersYet")}</p>
          ) : (
            <div className="divide-y divide-border/50 border border-border/50 rounded-lg overflow-hidden">
              {memberSorted.map((m) => (
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
      </CardContent>
    </Card>
  );
}
