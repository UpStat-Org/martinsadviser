import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Truck, FileCheck, MessageSquare, CalendarDays,
  Settings, LogOut, ChevronsLeft, ChevronsRight, ShieldCheck, BarChart3,
  ClipboardList, DollarSign, ScrollText, Menu, X, BookOpen, Sun, Moon,
  Briefcase, Activity, MoreHorizontal,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; icon: any; label: string };

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, user, fullName, role } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const sections = useMemo<{ label: string; items: NavItem[] }[]>(() => {
    const base = [
      {
        label: t("sidebar.section.overview"),
        items: [
          { to: "/", icon: LayoutDashboard, label: t("nav.dashboard") },
          { to: "/my", icon: Briefcase, label: t("mydesk.title") },
        ],
      },
      {
        label: t("sidebar.section.operation"),
        items: [
          { to: "/clients", icon: Users, label: t("nav.clients") },
          { to: "/trucks", icon: Truck, label: t("nav.trucks") },
          { to: "/permits", icon: FileCheck, label: t("nav.permits") },
          { to: "/tasks", icon: ClipboardList, label: t("nav.tasks") },
        ],
      },
      {
        label: t("sidebar.section.communication"),
        items: [
          { to: "/messages", icon: MessageSquare, label: t("nav.messages") },
          { to: "/calendar", icon: CalendarDays, label: t("nav.calendar") },
        ],
      },
      {
        label: t("sidebar.section.analysis"),
        items: [
          { to: "/reports", icon: BarChart3, label: t("nav.reports") },
          { to: "/finance", icon: DollarSign, label: t("nav.finance") },
        ],
      },
    ];
    if (isAdmin) {
      base.push({
        label: t("sidebar.section.administration"),
        items: [
          { to: "/workload", icon: Activity, label: t("sidebar.workload") },
          { to: "/admin/users", icon: ShieldCheck, label: t("nav.users") },
          { to: "/audit", icon: ScrollText, label: t("nav.audit") },
        ],
      });
    }
    return base;
  }, [t, isAdmin]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const showLabel = !collapsed || isMobile;

  const displayName = fullName || user?.email?.split("@")[0] || t("role.user");
  const initials = (fullName || user?.email || "U")
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "U";
  const roleLabel = role === "admin" ? t("role.admin") : role === "operator" ? t("role.operator") : role === "viewer" ? t("role.viewer") : t("role.user");

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.to);
    return (
      <NavLink
        key={item.to}
        to={item.to}
        title={collapsed && !isMobile ? item.label : undefined}
        className={cn(
          "group relative flex items-center gap-3 h-9 rounded-md text-[13px] font-medium transition-colors",
          collapsed && !isMobile ? "justify-center px-0 mx-1" : "px-2.5",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )}
      >
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />
        )}
        <item.icon
          className={cn(
            "w-4 h-4 shrink-0 transition-colors",
            active ? "text-sidebar-primary" : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/80"
          )}
        />
        {showLabel && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 h-14 border-b border-sidebar-border/40 shrink-0",
        collapsed && !isMobile ? "justify-center px-2" : "px-4"
      )}>
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-sidebar-primary via-sidebar-primary/80 to-purple-500 text-white font-display font-bold text-xs shrink-0 shadow-sm">
          MA
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-sidebar-background" />
        </div>
        {showLabel && (
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="font-display font-semibold text-sidebar-foreground text-[13px] truncate tracking-tight">
              MartinsAdviser
            </span>
            <span className="text-[10px] text-sidebar-foreground/50">Permit Management</span>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* User card */}
      {user && (
        <div className={cn(
          "border-b border-sidebar-border/40 shrink-0",
          collapsed && !isMobile ? "py-2 px-2 flex justify-center" : "p-3"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-md hover:bg-sidebar-accent/40 transition-colors group",
                  collapsed && !isMobile ? "p-1" : "p-1.5"
                )}
                title={collapsed && !isMobile ? displayName : undefined}
              >
                <div className="relative shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 ring-1 ring-sidebar-border/50 flex items-center justify-center text-[11px] font-semibold text-white shadow-sm">
                  {initials}
                </div>
                {showLabel && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-[12px] font-medium text-sidebar-foreground truncate">{displayName}</div>
                      <div className="text-[10px] text-sidebar-foreground/45 truncate">{roleLabel}</div>
                    </div>
                    <MoreHorizontal className="w-3.5 h-3.5 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-56">
              <DropdownMenuLabel className="text-xs">
                <div className="font-medium">{displayName}</div>
                <div className="text-muted-foreground text-[10px] truncate">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="w-3.5 h-3.5 mr-2" /> {t("nav.settings")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/docs")}>
                <BookOpen className="w-3.5 h-3.5 mr-2" /> {t("nav.docs")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark"
                  ? <><Sun className="w-3.5 h-3.5 mr-2" /> {t("sidebar.lightMode")}</>
                  : <><Moon className="w-3.5 h-3.5 mr-2" /> {t("sidebar.darkMode")}</>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                <LogOut className="w-3.5 h-3.5 mr-2" /> {t("nav.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto sidebar-scrollbar">
        <div className={cn("space-y-5", collapsed && !isMobile ? "px-1" : "px-2")}>
          {sections.map((section, idx) => (
            <div key={section.label} className="space-y-0.5">
              {showLabel ? (
                <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/35">
                  {section.label}
                </p>
              ) : (
                idx > 0 && <div className="my-2 mx-2 h-px bg-sidebar-border/40" />
              )}
              {section.items.map(renderNavItem)}
            </div>
          ))}
        </div>
      </nav>

      {/* Footer: collapse toggle + quick theme + logout */}
      <div className="border-t border-sidebar-border/40 shrink-0 p-2">
        {showLabel ? (
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={theme === "dark" ? t("sidebar.lightMode") : t("sidebar.darkMode")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => navigate("/settings")}
                title={t("nav.settings")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                title={t("nav.logout")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            {!isMobile && (
              <button
                onClick={() => setCollapsed(true)}
                title={t("sidebar.collapse")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/40 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? t("sidebar.lightMode") : t("sidebar.darkMode")}
              className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              title={t("nav.logout")}
              className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
            {!isMobile && (
              <button
                onClick={() => setCollapsed(false)}
                title={t("sidebar.expand")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/40 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            )}
          </div>
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
        "hidden lg:flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border/40 transition-[width] duration-300 relative",
        collapsed ? "w-[64px]" : "w-[232px]"
      )}
    >
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-sidebar-primary/[0.04] to-transparent pointer-events-none" />
      {sidebarContent}
    </aside>
  );
}
