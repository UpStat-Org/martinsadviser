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
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 text-sidebar-primary-foreground font-display font-bold text-sm shrink-0 shadow-soft">
          MA
        </div>
        {(!collapsed || isMobile) && (
          <span className="font-display font-bold text-sidebar-primary-foreground text-lg truncate tracking-tight">
            MartinsAdviser
          </span>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary rounded-r-full" />
              )}
              <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")} />
              {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        {isAdmin && (
          <>
            <NavLink
              to="/admin/users"
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                location.pathname === "/admin/users"
                  ? "bg-sidebar-accent text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              {location.pathname === "/admin/users" && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary rounded-r-full" />
              )}
              <ShieldCheck className={cn("w-5 h-5 shrink-0", location.pathname === "/admin/users" ? "text-sidebar-primary" : "text-sidebar-foreground/60")} />
              {(!collapsed || isMobile) && <span>{t("nav.users")}</span>}
            </NavLink>
            <NavLink
              to="/audit"
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                location.pathname === "/audit"
                  ? "bg-sidebar-accent text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              {location.pathname === "/audit" && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary rounded-r-full" />
              )}
              <ScrollText className={cn("w-5 h-5 shrink-0", location.pathname === "/audit" ? "text-sidebar-primary" : "text-sidebar-foreground/60")} />
              {(!collapsed || isMobile) && <span>{t("nav.audit")}</span>}
            </NavLink>
          </>
        )}
        <NavLink
          to="/settings"
          className={cn(
            "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
            location.pathname === "/settings"
              ? "bg-sidebar-accent text-sidebar-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          )}
        >
          {location.pathname === "/settings" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary rounded-r-full" />
          )}
          <Settings className={cn("w-5 h-5 shrink-0", location.pathname === "/settings" ? "text-sidebar-primary" : "text-sidebar-foreground/60")} />
          {(!collapsed || isMobile) && <span>{t("nav.settings")}</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive w-full"
        >
          <LogOut className="w-5 h-5 shrink-0 text-sidebar-foreground/60 group-hover:text-destructive transition-colors" />
          {(!collapsed || isMobile) && <span>{t("nav.logout")}</span>}
        </button>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-2 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
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
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-background border shadow-soft lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        )}

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
