import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Truck, FileCheck, MessageSquare, CalendarDays,
  Settings, LogOut, ChevronLeft, ChevronRight, ShieldCheck, BarChart3, ClipboardList, DollarSign, ScrollText, Menu, X, BookOpen,
  Sparkles, Sun, Moon, Briefcase, Activity,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const mainNavItems = [
    { to: "/", icon: LayoutDashboard, label: t("nav.dashboard") },
    { to: "/my", icon: Briefcase, label: "Minha Mesa" },
    { to: "/clients", icon: Users, label: t("nav.clients") },
    { to: "/trucks", icon: Truck, label: t("nav.trucks") },
    { to: "/permits", icon: FileCheck, label: t("nav.permits") },
    { to: "/tasks", icon: ClipboardList, label: t("nav.tasks") },
  ];

  const commsNavItems = [
    { to: "/messages", icon: MessageSquare, label: t("nav.messages") },
    { to: "/calendar", icon: CalendarDays, label: t("nav.calendar") },
  ];

  const insightsNavItems = [
    { to: "/reports", icon: BarChart3, label: t("nav.reports") },
    { to: "/finance", icon: DollarSign, label: t("nav.finance") },
    { to: "/docs", icon: BookOpen, label: t("nav.docs") },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const showLabel = !collapsed || isMobile;

  const renderNavItem = (item: { to: string; icon: any; label: string }) => {
    const active = isActive(item.to);
    return (
      <NavLink
        key={item.to}
        to={item.to}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 relative",
          collapsed && !isMobile && "justify-center px-0",
          active
            ? "bg-sidebar-accent text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
        )}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-gradient-to-b from-sidebar-primary to-sidebar-primary/60" />
        )}
        <item.icon
          className={cn(
            "w-[18px] h-[18px] shrink-0 transition-colors",
            active
              ? "text-sidebar-primary"
              : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
          )}
        />
        {showLabel && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
  };

  const renderSection = (label: string, items: typeof mainNavItems) => (
    <div className="space-y-0.5">
      {showLabel && (
        <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/30">
          {label}
        </p>
      )}
      {!showLabel && <div className="my-2 mx-3 h-px bg-sidebar-border/60" />}
      {items.map(renderNavItem)}
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 h-16 border-b border-sidebar-border/50 shrink-0",
        collapsed && !isMobile ? "justify-center px-2" : "px-5"
      )}>
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-sidebar-primary via-sidebar-primary/80 to-purple-500 text-white font-display font-bold text-xs shrink-0 shadow-lg shadow-sidebar-primary/20">
          MA
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-sidebar-background" />
        </div>
        {showLabel && (
          <div className="flex flex-col min-w-0">
            <span className="font-display font-bold text-sidebar-primary-foreground text-sm truncate tracking-tight leading-tight">
              MartinsAdviser
            </span>
            <span className="text-[10px] text-sidebar-foreground/40 leading-tight">
              Permit Management
            </span>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2.5 overflow-y-auto space-y-0.5 sidebar-scrollbar">
        {renderSection("Menu", mainNavItems)}
        {renderSection("Comunicação", commsNavItems)}
        {renderSection("Insights", insightsNavItems)}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border/50 p-2.5 space-y-0.5 shrink-0">
        {isAdmin && (
          <>
            {renderNavItem({ to: "/workload", icon: Activity, label: "Workload" })}
            {renderNavItem({ to: "/admin/users", icon: ShieldCheck, label: t("nav.users") })}
            {renderNavItem({ to: "/audit", icon: ScrollText, label: t("nav.audit") })}
          </>
        )}
        {renderNavItem({ to: "/settings", icon: Settings, label: t("nav.settings") })}

        <button
          onClick={handleLogout}
          title={collapsed ? t("nav.logout") : undefined}
          className={cn(
            "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 text-sidebar-foreground/60 hover:bg-red-500/10 hover:text-red-400 w-full",
            collapsed && !isMobile && "justify-center px-0"
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0 text-sidebar-foreground/40 group-hover:text-red-400 transition-colors" />
          {showLabel && <span>{t("nav.logout")}</span>}
        </button>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={collapsed ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}
          className={cn(
            "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground w-full",
            collapsed && !isMobile && "justify-center px-0"
          )}
        >
          {theme === "dark" ? (
            <Sun className="w-[18px] h-[18px] shrink-0 text-sidebar-foreground/40 group-hover:text-yellow-400 transition-colors" />
          ) : (
            <Moon className="w-[18px] h-[18px] shrink-0 text-sidebar-foreground/40 group-hover:text-sidebar-foreground transition-colors" />
          )}
          {showLabel && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-1.5 mt-1 rounded-md text-sidebar-foreground/30 hover:text-sidebar-foreground/60 hover:bg-sidebar-accent/30 transition-all"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
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
          <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        )}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border/50 shadow-2xl transition-transform duration-300",
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
        "hidden lg:flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border/40 transition-all duration-300 relative",
        collapsed ? "w-[60px]" : "w-60"
      )}
    >
      {/* Subtle gradient overlay at the top */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-sidebar-primary/[0.04] to-transparent pointer-events-none" />
      {sidebarContent}
    </aside>
  );
}
