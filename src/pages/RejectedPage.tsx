import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export default function RejectedPage() {
  const { t } = useLanguage();
  const handleLogout = async () => { await supabase.auth.signOut(); };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          <XCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="font-display text-xl font-bold text-foreground">{t("rejected.title")}</h2>
          <p className="text-muted-foreground">{t("rejected.desc")}</p>
          <Button variant="outline" onClick={handleLogout}>{t("nav.logout")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
