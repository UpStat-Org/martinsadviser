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
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const statusStyles: Record<string, string> = {
    pending:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    approved:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    rejected:
      "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };
  const statusLabel: Record<string, string> = {
    pending: t("common.pending"),
    approved: t("admin.approved"),
    rejected: t("admin.rejected"),
  };

  const dateLocale =
    language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR";

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
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
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: t("admin.statusUpdated") });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    <div className="space-y-6 animate-fade-in">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />

        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl flex-shrink-0">
            <UserCog className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
              {t("admin.title")}
            </h1>
            <p className="text-white/70 mt-2 text-sm sm:text-base max-w-xl">
              {t("admin.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ============ KPIs ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Total",
            value: stats.total,
            icon: Users,
            gradient: "from-indigo-500 to-violet-500",
          },
          {
            label: "Aprovados",
            value: stats.approved,
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-teal-500",
          },
          {
            label: "Pendentes",
            value: stats.pending,
            icon: Clock,
            gradient: "from-amber-500 to-orange-500",
          },
          {
            label: "Rejeitados",
            value: stats.rejected,
            icon: XCircle,
            gradient: "from-red-500 to-rose-500",
          },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() =>
              setFilterStatus(
                s.label === "Total"
                  ? "all"
                  : s.label === "Aprovados"
                  ? "approved"
                  : s.label === "Pendentes"
                  ? "pending"
                  : "rejected"
              )
            }
            className="group relative text-left overflow-hidden rounded-2xl bg-card border border-border/50 p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div
              className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${s.gradient} opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`}
            />
            <div className="relative flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md`}
              >
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="relative">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {s.label}
              </div>
              <div className="font-display text-3xl font-bold tracking-tight">
                {s.value}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ============ FILTERS ============ */}
      <div className="rounded-2xl bg-card border border-border/50 p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-muted/40 border-border/60 focus:bg-background rounded-xl"
          />
        </div>
        <div className="hidden sm:block h-8 w-px bg-border/60" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { value: "all", label: "Todos" },
            { value: "pending", label: "Pendentes" },
            { value: "approved", label: "Aprovados" },
            { value: "rejected", label: "Rejeitados" },
          ].map((f) => {
            const active = filterStatus === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? "btn-gradient text-white shadow-md"
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
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
              <Users className="w-9 h-9 text-indigo-500" />
            </div>
            <p className="font-display text-lg font-semibold mb-1">
              {search || filterStatus !== "all"
                ? "Nenhum usuário encontrado"
                : t("admin.noRequests")}
            </p>
            <p className="text-sm text-muted-foreground">
              {search || filterStatus !== "all"
                ? "Ajuste os filtros para visualizar usuários."
                : "Ainda não há solicitações de acesso."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  Usuário
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
                          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientFor(
                            profile.id
                          )} flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0`}
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
                              className={`w-4 h-4 rounded bg-gradient-to-br ${roleStyle.gradient} flex items-center justify-center flex-shrink-0`}
                            >
                              <Shield className="w-2.5 h-2.5 text-white" />
                            </span>
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
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
                            className="h-8 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
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
                            className="h-8 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            {t("admin.reject")}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteUserId(profile.id)}
                          disabled={deleteUser.isPending}
                          className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 flex items-center justify-center transition-colors disabled:opacity-50"
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
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-md">
                <Trash2 className="w-4 h-4 text-white" />
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
              className="bg-gradient-to-r from-red-500 to-rose-500 text-white hover:shadow-lg"
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
