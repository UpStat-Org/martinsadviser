import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  approval_status: string;
  created_at: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-warning text-warning-foreground" },
  approved: { label: "Aprovado", className: "bg-success text-success-foreground" },
  rejected: { label: "Rejeitado", className: "bg-destructive text-destructive-foreground" },
};

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
        <p className="text-muted-foreground mt-1">Aprove ou rejeite solicitações de acesso</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !profiles?.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma solicitação de acesso.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => {
                const status = statusMap[profile.approval_status] || statusMap.pending;
                return (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{profile.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge className={status.className}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {profile.approval_status !== "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success"
                            onClick={() => updateStatus.mutate({ id: profile.id, status: "approved" })}
                            disabled={updateStatus.isPending}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                        )}
                        {profile.approval_status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => updateStatus.mutate({ id: profile.id, status: "rejected" })}
                            disabled={updateStatus.isPending}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
