import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Truck, FileCheck, MessageSquare, CalendarDays,
  Settings, LogOut, ChevronsLeft, ChevronsRight, ShieldCheck, BarChart3,
  ClipboardList, DollarSign, ScrollText, Menu, X, BookOpen, Sun, Moon,
  Briefcase, Activity, MoreHorizontal, Server, Receipt, Beaker, Fuel, MapPin, Search, TrendingUp,
  IdCard,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { useOrg, splitWordmark, type FeatureFlag } from "@/contexts/OrgContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { useTheme } from "next-themes";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; icon: LucideIcon; label: string; external?: boolean; feature?: FeatureFlag };

export function AppSidebar() {
  const [collapsed, setCollapsed] = useLocalStorageState("dotpilot-sidebar-collapsed", false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, fullName, role } = useAuth();
  const { hasFeature, branding, isOrgAdmin } = useOrg();
  const { data: isSuperAdmin } = useSuperAdmin();
  const wordmark = splitWordmark(branding);
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const sections = useMemo<{ label: string; items: NavItem[] }[]>(() => {
    const filterByFeature = (items: NavItem[]) =>
      items.filter((it) => !it.feature || hasFeature(it.feature));

    const base: { label: string; items: NavItem[] }[] = [
      {
        label: t("sidebar.section.overview"),
        items: filterByFeature([
          { to: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
          { to: "/my", icon: Briefcase, label: t("mydesk.title") },
          { to: "https://status.dotpilot.online", icon: Server, label: t("sidebar.systemStatus"), external: true },
        ]),
      },
      {
        label: t("sidebar.section.operation"),
        items: filterByFeature([
          { to: "/clients", icon: Users, label: t("nav.clients") },
          { to: "/trucks", icon: Truck, label: t("nav.trucks") },
          { to: "/drivers", icon: IdCard, label: t("nav.drivers") },
          { to: "/permits", icon: FileCheck, label: t("nav.permits") },
          { to: "/tasks", icon: ClipboardList, label: t("nav.tasks") },
          { to: "/drug-testing", icon: ShieldCheck, label: t("sidebar.drugTesting") },
          { to: "/hvut", icon: Receipt, label: t("sidebar.hvut") },
          { to: "/ifta", icon: Fuel, label: t("sidebar.ifta") },
          { to: "/irp", icon: MapPin, label: t("sidebar.irp") },
          { to: "/safer-lookup", icon: Search, label: t("sidebar.saferLookup") },
        ]),
      },
      {
        label: t("sidebar.section.communication"),
        items: filterByFeature([
          { to: "/messages", icon: MessageSquare, label: t("nav.messages"), feature: "messages" },
          { to: "/calendar", icon: CalendarDays, label: t("nav.calendar"), feature: "calendar" },
          { to: "/compliance-calendar", icon: CalendarDays, label: t("sidebar.complianceCal") },
        ]),
      },
      {
        label: t("sidebar.section.analysis"),
        items: filterByFeature([
          { to: "/reports", icon: BarChart3, label: t("nav.reports") },
          { to: "/finance", icon: DollarSign, label: t("nav.finance"), feature: "finance" },
          { to: "/profit-per-client", icon: TrendingUp, label: t("sidebar.profitPerClient") },
        ]),
      },
    ];
    if (isOrgAdmin) {
      base.push({
        label: t("sidebar.section.administration"),
        items: filterByFeature([
          { to: "/workload", icon: Activity, label: t("sidebar.workload") },
          { to: "/admin/users", icon: ShieldCheck, label: t("nav.users") },
          { to: "/admin/ifta-rates", icon: Fuel, label: t("sidebar.iftaRates") },
          { to: "/admin/task-templates", icon: ClipboardList, label: t("sidebar.taskTemplates") },
          { to: "/audit", icon: ScrollText, label: t("nav.audit"), feature: "audit_log" },
        ]),
      });
    }
    if (isSuperAdmin) {
      base.push({
        // Super-admin section labels stay in English — only platform owners
        // ever see this section and the strings double as the page title.
        label: "Super-admin",
        items: [
          { to: "/super-admin", icon: ShieldCheck, label: "Organizations" },
        ],
      });
    }
    // Drop sections that became empty after filtering (e.g. communication off entirely)
    return base.filter((section) => section.items.length > 0);
  }, [t, isOrgAdmin, isSuperAdmin, hasFeature]);

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
    const active = !item.external && isActive(item.to);
    const className = cn(
      "group relative flex items-center gap-2.5 h-8 rounded-md text-[13px] transition-colors",
      collapsed && !isMobile ? "justify-center px-0 mx-1" : "px-2.5",
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
    );
    const content = (
      <>
        {active && !collapsed && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-sidebar-primary" />
        )}
        <item.icon
          className={cn(
            "w-4 h-4 shrink-0 transition-colors",
            active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/55 group-hover:text-sidebar-accent-foreground"
          )}
        />
        {showLabel && <span className="truncate">{item.label}</span>}
      </>
    );

    if (item.external) {
      return (
        <a
          key={item.to}
          href={item.to}
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed && !isMobile ? item.label : undefined}
          className={className}
        >
          {content}
        </a>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        title={collapsed && !isMobile ? item.label : undefined}
        className={className}
      >
        {content}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo + wordmark — neutral, no status dot, no halo. */}
      <div className={cn(
        "flex items-center gap-2.5 h-14 border-b border-sidebar-border shrink-0",
        collapsed && !isMobile ? "justify-center px-2" : "px-4"
      )}>
        <Logo
          src={branding.logo_url}
          title={branding.app_name}
          className="w-7 h-7 rounded shrink-0"
        />
        {showLabel && (
          <Wordmark
            size="md"
            tone="dark"
            className="min-w-0"
            primary={wordmark.primary}
            secondary={wordmark.secondary}
            accentColor={branding.accent_color}
          />
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* User card */}
      {user && (
        <div className={cn(
          "border-b border-sidebar-border shrink-0",
          collapsed && !isMobile ? "py-2 px-2 flex justify-center" : "p-2"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-md hover:bg-sidebar-accent transition-colors group",
                  collapsed && !isMobile ? "p-1" : "p-1.5"
                )}
                title={collapsed && !isMobile ? displayName : undefined}
              >
                {/* Flat avatar — square with subtle radius, no gradient. */}
                <div className="shrink-0 w-7 h-7 rounded bg-secondary text-secondary-foreground flex items-center justify-center text-[11px] font-semibold border border-sidebar-border">
                  {initials}
                </div>
                {showLabel && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-[12px] font-medium text-sidebar-foreground truncate">{displayName}</div>
                      <div className="text-[10px] text-sidebar-foreground/55 truncate">{roleLabel}</div>
                    </div>
                    <MoreHorizontal className="w-3.5 h-3.5 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70" />
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
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-3.5 h-3.5 mr-2" /> {t("nav.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Org switcher (renders nothing if user belongs to <=1 org) */}
      <OrgSwitcher collapsed={collapsed && !isMobile} />

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto sidebar-scrollbar">
        <div className={cn("space-y-4", collapsed && !isMobile ? "px-1" : "px-2")}>
          {sections.map((section, idx) => (
            <div key={section.label} className="space-y-px">
              {showLabel ? (
                <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {section.label}
                </p>
              ) : (
                idx > 0 && <div className="my-2 mx-2 h-px bg-sidebar-border" />
              )}
              {section.items.map(renderNavItem)}
            </div>
          ))}
        </div>
      </nav>

      {/* Footer: collapse toggle + quick theme + logout */}
      <div className="border-t border-sidebar-border shrink-0 p-2">
        {showLabel ? (
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={theme === "dark" ? t("sidebar.lightMode") : t("sidebar.darkMode")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => navigate("/settings")}
                title={t("nav.settings")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                title={t("nav.logout")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            {!isMobile && (
              <button
                onClick={() => setCollapsed(true)}
                title={t("sidebar.collapse")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
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
              className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              title={t("nav.logout")}
              className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
            {!isMobile && (
              <button
                onClick={() => setCollapsed(false)}
                title={t("sidebar.expand")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
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
          className="fixed top-3 left-3 z-50 p-2 rounded-md bg-card border border-border shadow-soft lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-foreground/40" onClick={() => setMobileOpen(false)} />
        )}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-soft-lg transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop sidebar — neutral surface, hairline border, no decorative overlay.
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200 relative",
        collapsed ? "w-[60px]" : "w-[224px]"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
