import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Loader2, Users, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Profile { id: string; full_name: string | null; email: string | null; approval_status: string; created_at: string; }
interface UserRole { id: string; user_id: string; role: string; }

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();

  const statusMap: Record<string, { label: string; className: string }> = {
    pending: { label: t("common.pending"), className: "bg-warning text-warning-foreground" },
    approved: { label: t("admin.approved"), className: "bg-success text-success-foreground" },
    rejected: { label: t("admin.rejected"), className: "bg-destructive text-destructive-foreground" },
  };

  const dateLocale = language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR";

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data as UserRole[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("profiles").update({ approval_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-profiles"] }); toast({ title: t("admin.statusUpdated") }); },
    onError: (error: any) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Delete existing roles
      await supabase.from("user_roles").delete().eq("user_id", userId);
      // Insert new role
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast({ title: t("admin.roleUpdated") });
    },
    onError: (error: any) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });

  const getUserRole = (userId: string) => {
    const role = allRoles?.find((r) => r.user_id === userId);
    return role?.role || "user";
  };

  const roleLabel = (r: string) => {
    const map: Record<string, string> = { admin: "Admin", operator: t("admin.operator"), viewer: t("admin.viewer"), user: t("admin.userRole") };
    return map[r] || r;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{t("admin.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("admin.subtitle")}</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !profiles?.length ? (
        <Card><CardContent className="p-12 text-center"><Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">{t("admin.noRequests")}</p></CardContent></Card>
      ) : (
        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>{t("admin.name")}</TableHead>
            <TableHead>{t("login.email")}</TableHead>
            <TableHead>{t("admin.date")}</TableHead>
            <TableHead>{t("clients.status")}</TableHead>
            <TableHead>{t("admin.role")}</TableHead>
            <TableHead className="text-right">{t("common.actions")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {profiles.map((profile) => {
              const status = statusMap[profile.approval_status] || statusMap.pending;
              const currentRole = getUserRole(profile.id);
              return (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{profile.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(profile.created_at).toLocaleDateString(dateLocale)}</TableCell>
                  <TableCell><Badge className={status.className}>{status.label}</Badge></TableCell>
                  <TableCell>
                    <Select value={currentRole} onValueChange={(v) => setRole.mutate({ userId: profile.id, role: v })}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="operator">{t("admin.operator")}</SelectItem>
                        <SelectItem value="viewer">{t("admin.viewer")}</SelectItem>
                        <SelectItem value="user">{t("admin.userRole")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {profile.approval_status !== "approved" && (
                        <Button size="sm" variant="outline" className="text-success" onClick={() => updateStatus.mutate({ id: profile.id, status: "approved" })} disabled={updateStatus.isPending}>
                          <Check className="w-4 h-4 mr-1" />{t("admin.approve")}
                        </Button>
                      )}
                      {profile.approval_status !== "rejected" && (
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatus.mutate({ id: profile.id, status: "rejected" })} disabled={updateStatus.isPending}>
                          <X className="w-4 h-4 mr-1" />{t("admin.reject")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table></Card>
      )}
    </div>
  );
}
