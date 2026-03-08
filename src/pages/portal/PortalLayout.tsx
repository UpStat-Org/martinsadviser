import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, LogOut, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function PortalLayout() {
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/portal/login"); return; }

      const { data: portalLink } = await supabase
        .from("client_portal_users")
        .select("client_id")
        .eq("user_id", user.id)
        .single();

      if (!portalLink) { 
        await supabase.auth.signOut();
        navigate("/portal/login"); 
        return; 
      }

      setClientId(portalLink.client_id);

      const { data: client } = await supabase
        .from("clients")
        .select("company_name")
        .eq("id", portalLink.client_id)
        .single();

      if (client) setCompanyName(client.company_name);
      setLoading(false);
    };
    check();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/portal/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LanguageSwitcher />
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-lg leading-tight">{companyName}</h1>
              <Badge variant="outline" className="text-xs">{t("portal.readOnly")}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />{t("portal.logout")}
          </Button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet context={{ clientId }} />
      </main>
    </div>
  );
}
