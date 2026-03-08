import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PendingApproval() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          <Clock className="w-12 h-12 text-warning mx-auto" />
          <h2 className="font-display text-xl font-bold text-foreground">Aguardando Aprovação</h2>
          <p className="text-muted-foreground">
            Sua conta está em análise. O administrador irá avaliar sua solicitação em breve.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
