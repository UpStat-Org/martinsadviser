import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Check,
  X,
  Loader2,
  Users,
  Trash2,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  UserCog,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrg } from "@/contexts/OrgContext";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  approval_status: string;
  created_at: string;
}
interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-red-500",
  "from-fuchsia-500 to-pink-500",
  "from-sky-500 to-blue-500",
  "from-purple-500 to-indigo-500",
];

function gradientFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(1, "?");
}

const ROLE_STYLES: Record<string, { gradient: string; label: string }> = {
  admin: { gradient: "from-fuchsia-500 to-pink-500", label: "Admin" },
  operator: { gradient: "from-indigo-500 to-violet-500", label: "Operator" },
  viewer: { gradient: "from-sky-500 to-blue-500", label: "Viewer" },
  user: { gradient: "from-slate-500 to-zinc-500", label: "User" },
};

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const { currentOrg } = useOrg();
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const statusStyles: Record<string, string> = {
    pending:
      "bg-warning/10 text-warning border-warning/20",
    approved:
      "bg-success/10 text-success border-success/20",
    rejected:
      "bg-destructive/10 text-destructive border-destructive/20",
  };
  const statusLabel: Record<string, string> = {
    pending: t("common.pending"),
    approved: t("admin.approved"),
    rejected: t("admin.rejected"),
  };

  const dateLocale =
    language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR";

  // Scope the user list to the CURRENT org's members via list_org_members
  // (SECURITY DEFINER). A global SELECT on profiles would expose users from
  // every tenant to anyone holding the legacy global 'admin' role.
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_org_members", { p_org_id: currentOrg!.id });
      if (error) throw error;
      return ((data ?? []) as Array<{ user_id: string; approval_status: string; joined_at: string; email: string | null; full_name: string | null }>)
        .map((m) => ({
          id: m.user_id,
          full_name: m.full_name,
          email: m.email,
          approval_status: m.approval_status,
          created_at: m.joined_at,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as Profile[];
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
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ approval_status: status })
        .eq("id", id);
      if (profErr) throw profErr;

      // Mirror status to THIS org's membership only — never touch the user's
      // memberships in other organizations.
      let memQuery = supabase
        .from("organization_members")
        .update({ approval_status: status })
        .eq("user_id", id);
      if (currentOrg?.id) memQuery = memQuery.eq("organization_id", currentOrg.id);
      const { error: memErr } = await memQuery;
      if (memErr) throw memErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: t("admin.statusUpdated") });
    },
    onError: (error: any) => {
      toast({ title: t("toast.error"), description: error.message, variant: "destructive" });
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast({ title: t("admin.roleUpdated") });
    },
    onError: (error: any) => {
      toast({ title: t("toast.error"), description: error.message, variant: "destructive" });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast({ title: t("admin.userDeleted") });
      setDeleteUserId(null);
    },
    onError: (error: any) => {
      toast({ title: t("toast.error"), description: error.message, variant: "destructive" });
      setDeleteUserId(null);
    },
  });

  const getUserRole = (userId: string) => {
    const role = allRoles?.find((r) => r.user_id === userId);
    return role?.role || "user";
  };

  const stats = useMemo(() => {
    const total = profiles?.length ?? 0;
    const approved =
      profiles?.filter((p) => p.approval_status === "approved").length ?? 0;
    const pending =
      profiles?.filter((p) => p.approval_status === "pending").length ?? 0;
    const rejected =
      profiles?.filter((p) => p.approval_status === "rejected").length ?? 0;
    return { total, approved, pending, rejected };
  }, [profiles]);

  const filtered = useMemo(() => {
    if (!profiles) return [];
    return profiles.filter((p) => {
      if (filterStatus !== "all" && p.approval_status !== filterStatus)
        return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (p.full_name || "").toLowerCase();
        const email = (p.email || "").toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [profiles, filterStatus, search]);

  return (
    <div className="space-y-6">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-md bg-card border border-border p-4 sm:p-5">

        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-md bg-card border border-border flex items-center justify-center flex-shrink-0">
            <UserCog className="w-6 h-6 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
              {t("admin.title")}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl">
              {t("admin.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ============ KPIs ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: t("admin.total"),
            filter: "all",
            value: stats.total,
            icon: Users,
            gradient: "from-indigo-500 to-violet-500",
          },
          {
            label: t("admin.approved"),
            filter: "approved",
            value: stats.approved,
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-teal-500",
          },
          {
            label: t("admin.pending"),
            filter: "pending",
            value: stats.pending,
            icon: Clock,
            gradient: "from-amber-500 to-orange-500",
          },
          {
            label: t("admin.rejected"),
            filter: "rejected",
            value: stats.rejected,
            icon: XCircle,
            gradient: "from-red-500 to-rose-500",
          },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() =>
              setFilterStatus(s.filter)
            }
            className="group relative text-left overflow-hidden rounded-md bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div
              className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-secondary text-secondary-foreground border border-border opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`}
            />
            <div className="relative flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center`}
              >
                <s.icon className="w-4 h-4 text-foreground" />
              </div>
            </div>
            <div className="relative">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {s.label}
              </div>
              <div className="text-xl font-semibold tracking-tight tracking-tight">
                {s.value}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ============ FILTERS ============ */}
      <div className="rounded-md bg-card border border-border/50 p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-muted/40 border-border/60 focus:bg-background rounded-md"
          />
        </div>
        <div className="hidden sm:block h-8 w-px bg-border/60" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { value: "all", label: t("permits.all") },
            { value: "pending", label: t("admin.pending") },
            { value: "approved", label: t("admin.approved") },
            { value: "rejected", label: t("admin.rejected") },
          ].map((f) => {
            const active = filterStatus === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value)}
                className={`h-8 px-3 rounded-md text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 text-foreground shadow-md"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ TABLE ============ */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !filtered.length ? (
        <Card className="border-border/50">
          <CardContent className="p-16 text-center">
            <div className="w-20 h-20 rounded-md bg-secondary text-secondary-foreground border border-border border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
              <Users className="w-9 h-9 text-indigo-500" />
            </div>
            <p className="text-base font-semibold font-semibold mb-1">
              {search || filterStatus !== "all"
                ? t("adminUsers.noUsers")
                : t("adminUsers.noRequests")}
            </p>
            <p className="text-sm text-muted-foreground">
              {search || filterStatus !== "all"
                ? t("adminUsers.adjustFilters")
                : t("adminUsers.noRequests")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("adminUsers.colUser")}
                </TableHead>
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("admin.date")}
                </TableHead>
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("clients.status")}
                </TableHead>
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("admin.role")}
                </TableHead>
                <TableHead className="text-right font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((profile) => {
                const currentRole = getUserRole(profile.id);
                const roleStyle = ROLE_STYLES[currentRole] || ROLE_STYLES.user;
                const name = profile.full_name || "—";
                return (
                  <TableRow
                    key={profile.id}
                    className="group hover:bg-muted/40 transition-colors border-border/50"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center text-foreground font-semibold text-sm flex-shrink-0`}
                        >
                          {initials(name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {profile.email || "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString(dateLocale)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center h-6 px-2.5 rounded-md text-xs font-semibold border ${statusStyles[profile.approval_status]}`}
                      >
                        {statusLabel[profile.approval_status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentRole}
                        onValueChange={(v) =>
                          setRole.mutate({ userId: profile.id, role: v })
                        }
                      >
                        <SelectTrigger className="w-36 h-8 rounded-lg border-border/60">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-4 h-4 rounded bg-secondary text-secondary-foreground border border-border flex items-center justify-center flex-shrink-0`}
                            >
                              <Shield className="w-2.5 h-2.5 text-secondary-foreground" />
                            </span>
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">{t("admin.roleAdmin")}</SelectItem>
                          <SelectItem value="operator">
                            {t("admin.operator")}
                          </SelectItem>
                          <SelectItem value="viewer">
                            {t("admin.viewer")}
                          </SelectItem>
                          <SelectItem value="user">{t("admin.userRole")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                        {profile.approval_status !== "approved" && (
                          <button
                            onClick={() =>
                              updateStatus.mutate({
                                id: profile.id,
                                status: "approved",
                              })
                            }
                            disabled={updateStatus.isPending}
                            className="h-8 px-2.5 rounded-md bg-success/10 hover:bg-success/20 border border-success/20 text-success text-xs font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {t("admin.approve")}
                          </button>
                        )}
                        {profile.approval_status !== "rejected" && (
                          <button
                            onClick={() =>
                              updateStatus.mutate({
                                id: profile.id,
                                status: "rejected",
                              })
                            }
                            disabled={updateStatus.isPending}
                            className="h-8 px-2.5 rounded-md bg-warning/10 hover:bg-warning/20 border border-warning/20 text-warning text-xs font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            {t("admin.reject")}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteUserId(profile.id)}
                          disabled={deleteUser.isPending}
                          className="w-8 h-8 rounded-md bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <AlertDialog
        open={!!deleteUserId}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
      >
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-secondary-foreground" />
              </div>
              {t("admin.deleteUser")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteUserConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-secondary text-secondary-foreground border border-border hover:shadow-lg"
              onClick={() => deleteUserId && deleteUser.mutate(deleteUserId)}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              )}
              {t("admin.deleteUser")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
