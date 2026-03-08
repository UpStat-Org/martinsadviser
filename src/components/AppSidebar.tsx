import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Truck, FileCheck, MessageSquare, CalendarDays,
  Settings, LogOut, ChevronLeft, ChevronRight, ShieldCheck, BarChart3, ClipboardList, DollarSign, ScrollText, Menu, X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: t("nav.dashboard") },
    { to: "/clients", icon: Users, label: t("nav.clients") },
    { to: "/trucks", icon: Truck, label: t("nav.trucks") },
    { to: "/permits", icon: FileCheck, label: t("nav.permits") },
    { to: "/messages", icon: MessageSquare, label: t("nav.messages") },
    { to: "/calendar", icon: CalendarDays, label: t("nav.calendar") },
    { to: "/reports", icon: BarChart3, label: t("nav.reports") },
    { to: "/tasks", icon: ClipboardList, label: t("nav.tasks") },
    { to: "/finance", icon: DollarSign, label: t("nav.finance") },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-display font-bold text-sm shrink-0">
          MA
        </div>
        {(!collapsed || isMobile) && (
          <span className="font-display font-semibold text-sidebar-primary-foreground text-lg truncate">
            MartinsAdviser
          </span>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto text-sidebar-foreground/60">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        {isAdmin && (
          <>
            <NavLink
              to="/admin/users"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                location.pathname === "/admin/users" && "bg-sidebar-accent text-sidebar-primary"
              )}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              {(!collapsed || isMobile) && <span>{t("nav.users")}</span>}
            </NavLink>
            <NavLink
              to="/audit"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                location.pathname === "/audit" && "bg-sidebar-accent text-sidebar-primary"
              )}
            >
              <ScrollText className="w-5 h-5 shrink-0" />
              {(!collapsed || isMobile) && <span>{t("nav.audit")}</span>}
            </NavLink>
          </>
        )}
        <NavLink
          to="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            location.pathname === "/settings" && "bg-sidebar-accent text-sidebar-primary"
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {(!collapsed || isMobile) && <span>{t("nav.settings")}</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {(!collapsed || isMobile) && <span>{t("nav.logout")}</span>}
        </button>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-2 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile hamburger button - rendered in AppLayout */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-background border shadow-sm lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
        )}

        {/* Sidebar drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
