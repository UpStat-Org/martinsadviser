import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { TruckLoadingScreen } from "@/components/TruckLoadingScreen";
import { PortalSidebar } from "@/components/PortalSidebar";

export default function PortalLayout() {
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("overview");
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
      setUserEmail(user.email ?? null);

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

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    const el = document.getElementById(`portal-section-${section}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return <TruckLoadingScreen />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PortalSidebar
        companyName={companyName}
        userEmail={userEmail}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />
      <main className="flex-1 overflow-auto">
        {/* Top bar mirrors AppLayout: flat, hairline border, no blur. */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="max-w-screen-2xl mx-auto pl-14 pr-4 lg:px-8 h-12 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground truncate">
                {companyName}
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {t("portal.readOnly")}
            </Badge>
          </div>
        </div>
        <div className="px-4 py-5 lg:px-8 lg:py-6 max-w-screen-2xl mx-auto">
          <Outlet context={{ clientId, activeSection, setActiveSection }} />
        </div>
      </main>
    </div>
  );
}
