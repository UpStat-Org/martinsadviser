import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Truck, FileCheck, MessageSquare, CalendarDays,
  Settings, LogOut, ChevronsLeft, ChevronsRight, ChevronDown, ChevronRight,
  ShieldCheck, BarChart3, ClipboardList, DollarSign, ScrollText, Menu, X,
  BookOpen, Sun, Moon, Briefcase, Activity, MoreHorizontal, Receipt,
  Fuel, MapPin, Search, TrendingUp, IdCard, Target, FileText, Wallet,
  Repeat, Package, Gavel, BriefcaseBusiness,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { useOrg, splitWordmark, type FeatureFlag } from "@/contexts/OrgContext";
import { type CountryCode } from "@/lib/region";
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

type NavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  external?: boolean;
  feature?: FeatureFlag;
  /** Países onde o item existe. Ausente = vale para todos. */
  countries?: CountryCode[];
};

/** Grupo expansível: um item-pai que revela sub-itens inline (ou em flyout quando colapsado). */
type NavGroup = {
  key: string;
  icon: LucideIcon;
  label: string;
  items: NavItem[];
};

type NavEntry = NavItem | NavGroup;

type Section = { label: string; entries: NavEntry[] };

const isGroup = (entry: NavEntry): entry is NavGroup => "items" in entry;

const GROUP_DEFAULTS: Record<string, boolean> = {
  compliance: false,
  finance: false,
};

export function AppSidebar() {
  const [collapsed, setCollapsed] = useLocalStorageState("dotpilot-sidebar-collapsed", false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useLocalStorageState<Record<string, boolean>>(
    "dotpilot-nav-groups",
    GROUP_DEFAULTS
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { user, fullName, role } = useAuth();
  const { hasFeature, branding, isOrgAdmin, country } = useOrg();
  const { data: isSuperAdmin } = useSuperAdmin();
  const wordmark = splitWordmark(branding);
  const { t } = useLanguage();
  const isMobile = useIsMobile(1024);
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const sections = useMemo<Section[]>(() => {
    // Duas exclusões diferentes na mesma passada: `feature` é comercial (a org
    // não contratou o módulo) e `countries` é factual (o módulo não existe no
    // país dela).
    const filterByFeature = (items: NavItem[]) =>
      items.filter((it) =>
        (!it.feature || hasFeature(it.feature)) &&
        (!it.countries || it.countries.includes(country))
      );

    // Itens por país (EUA/BR) agrupados num único menu expansível.
    const complianceGroup: NavGroup = {
      key: "compliance",
      icon: ShieldCheck,
      label: t("sidebar.compliance"),
      items: filterByFeature([
        { to: "/drug-testing", icon: ShieldCheck, label: t("sidebar.drugTesting"), countries: ["US"] },
        { to: "/hvut", icon: Receipt, label: t("sidebar.hvut"), countries: ["US"] },
        { to: "/ifta", icon: Fuel, label: t("sidebar.ifta"), countries: ["US"] },
        { to: "/irp", icon: MapPin, label: t("sidebar.irp"), countries: ["US"] },
        { to: "/safer-lookup", icon: Search, label: t("sidebar.saferLookup"), countries: ["US"] },
        { to: "/compliance-calendar", icon: CalendarDays, label: t("sidebar.complianceCal"), countries: ["US"] },
        { to: "/br/compliance", icon: ShieldCheck, label: t("br.compliance.nav"), countries: ["BR"] },
        { to: "/br/multas", icon: Gavel, label: t("br.fines.nav"), countries: ["BR"] },
      ]),
    };

    // Relatórios e financeiro num único grupo expansível.
    const financeGroup: NavGroup = {
      key: "finance",
      icon: DollarSign,
      label: t("sidebar.group.finance"),
      items: filterByFeature([
        { to: "/reports", icon: BarChart3, label: t("nav.reports") },
        { to: "/finance", icon: DollarSign, label: t("nav.finance"), feature: "finance" },
        { to: "/expenses", icon: Wallet, label: t("sidebar.expenses"), feature: "finance" },
        { to: "/recurring-plans", icon: Repeat, label: t("sidebar.recurring"), feature: "finance" },
        { to: "/profit-per-client", icon: TrendingUp, label: t("sidebar.profitPerClient") },
      ]),
    };

    const base: Section[] = [
      {
        label: t("sidebar.section.overview"),
        entries: filterByFeature([
          { to: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
          { to: "/my", icon: Briefcase, label: t("mydesk.title") },
        ]),
      },
      {
        label: t("sidebar.section.operation"),
        entries: [
          ...filterByFeature([
            { to: "/clients", icon: Users, label: t("nav.clients") },
            { to: "/trucks", icon: Truck, label: t("nav.trucks") },
            { to: "/drivers", icon: IdCard, label: t("nav.drivers") },
            { to: "/permits", icon: FileCheck, label: t("nav.permits") },
            { to: "/service-orders", icon: BriefcaseBusiness, label: t("nav.serviceOrders") },
            { to: "/loads", icon: Package, label: t("nav.loads") },
            { to: "/tasks", icon: ClipboardList, label: t("nav.tasks") },
          ]),
          ...(complianceGroup.items.length > 0 ? [complianceGroup] : []),
        ],
      },
      {
        label: t("sidebar.section.commercial"),
        entries: [
          ...filterByFeature([
            { to: "/leads", icon: Target, label: t("nav.leads"), feature: "crm" },
            { to: "/quotes", icon: FileText, label: t("nav.quotes"), feature: "crm" },
          ]),
          ...(financeGroup.items.length > 0 ? [financeGroup] : []),
        ],
      },
      {
        label: t("sidebar.section.communication"),
        entries: filterByFeature([
          { to: "/messages", icon: MessageSquare, label: t("nav.messages"), feature: "messages" },
          { to: "/calendar", icon: CalendarDays, label: t("nav.calendar"), feature: "calendar" },
        ]),
      },
    ];
    if (isOrgAdmin) {
      base.push({
        label: t("sidebar.section.administration"),
        entries: filterByFeature([
          { to: "/workload", icon: Activity, label: t("sidebar.workload") },
          { to: "/admin/users", icon: ShieldCheck, label: t("nav.users") },
          { to: "/admin/ifta-rates", icon: Fuel, label: t("sidebar.iftaRates"), countries: ["US"] },
          { to: "/admin/task-templates", icon: ClipboardList, label: t("sidebar.taskTemplates") },
          { to: "/admin/services", icon: Package, label: t("sidebar.services"), feature: "crm" },
          { to: "/audit", icon: ScrollText, label: t("nav.audit"), feature: "audit_log" },
        ]),
      });
    }
    if (isSuperAdmin) {
      base.push({
        // Super-admin section labels stay in English — only platform owners
        // ever see this section and the strings double as the page title.
        label: "Super-admin",
        entries: [
          { to: "/super-admin", icon: ShieldCheck, label: "Organizations" },
        ],
      });
    }
    // Drop sections that became empty after filtering (e.g. communication off entirely)
    return base.filter((section) => section.entries.length > 0);
  }, [t, isOrgAdmin, isSuperAdmin, hasFeature, country]);

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

  const renderNavItem = (item: NavItem, variant: "root" | "child" = "root") => {
    const active = !item.external && isActive(item.to);
    const isChild = variant === "child";
    const className = cn(
      "group relative flex items-center gap-2.5 rounded-md text-[13px] transition-colors",
      collapsed && !isMobile ? "justify-center px-0 mx-1 h-9" : isChild ? "h-8 px-2.5 pl-9" : "h-9 px-2.5",
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
            "shrink-0 transition-colors",
            isChild ? "w-3.5 h-3.5" : "w-4 h-4",
            active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/65 group-hover:text-sidebar-accent-foreground"
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

  const renderNavGroup = (group: NavGroup) => {
    const open = !!openGroups[group.key];
    const groupActive = group.items.some((it) => !it.external && isActive(it.to));

    // Sidebar colapsada (só ícones): flyout com os sub-itens do grupo.
    if (!showLabel) {
      return (
        <DropdownMenu key={group.key}>
          <DropdownMenuTrigger asChild>
            <button
              title={group.label}
              className={cn(
                "group relative flex items-center justify-center h-8 rounded-md text-[13px] transition-colors mx-1",
                open || groupActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <group.icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  open || groupActive
                    ? "text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/65 group-hover:text-sidebar-accent-foreground"
                )}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-56">
            <DropdownMenuLabel className="text-xs">
              <div className="flex items-center gap-2">
                <group.icon className="w-3.5 h-3.5" /> {group.label}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {group.items.map((item) => (
              <DropdownMenuItem
                key={item.to}
                onClick={() => {
                  if (item.external) window.open(item.to, "_blank", "noopener,noreferrer");
                  else navigate(item.to);
                }}
                className="text-[13px]"
              >
                <item.icon className="w-3.5 h-3.5 mr-2" /> {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    // Sidebar expandida: disclosure inline com chevron.
    return (
      <div key={group.key}>
        <button
          onClick={() => toggleGroup(group.key)}
          aria-expanded={open}
          className={cn(
            "group relative flex items-center gap-2.5 h-9 w-full rounded-md text-[13px] transition-colors px-2.5",
            open || groupActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          )}
        >
          <group.icon
            className={cn(
              "w-4 h-4 shrink-0 transition-colors",
              open || groupActive
                ? "text-sidebar-accent-foreground"
                : "text-sidebar-foreground/65 group-hover:text-sidebar-accent-foreground"
            )}
          />
          <span className="truncate flex-1 text-left">{group.label}</span>
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-sidebar-foreground/40" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-sidebar-foreground/40" />
          )}
        </button>
        {open && (
          <div className="relative mt-0.5 space-y-px">
            <span aria-hidden className="absolute left-3 top-1.5 bottom-1.5 w-px bg-sidebar-border" />
            {group.items.map((item) => renderNavItem(item, "child"))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo + wordmark — neutral, no status dot, no halo. */}
      <div className={cn(
        "flex items-center gap-2.5 h-16 border-b border-sidebar-border shrink-0",
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
            tone="light"
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
                <div className="shrink-0 w-7 h-7 rounded bg-sidebar-accent text-sidebar-foreground flex items-center justify-center text-[11px] font-semibold border border-sidebar-border">
                  {initials}
                </div>
                {showLabel && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-[12px] font-medium text-sidebar-foreground truncate">{displayName}</div>
                      <div className="text-[10px] text-sidebar-foreground/65 truncate">{roleLabel}</div>
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
      <nav className="flex-1 py-4 overflow-y-auto sidebar-scrollbar">
        <div className={cn("space-y-4", collapsed && !isMobile ? "px-1" : "px-2")}>
          {sections.map((section, idx) => (
            <div key={section.label} className="space-y-px">
              {showLabel ? (
                <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/65">
                  {section.label}
                </p>
              ) : (
                idx > 0 && <div className="my-2 mx-2 h-px bg-sidebar-border" />
              )}
              {section.entries.map((entry) =>
                isGroup(entry) ? renderNavGroup(entry) : renderNavItem(entry)
              )}
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
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => navigate("/settings")}
                title={t("nav.settings")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                title={t("nav.logout")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/65 hover:bg-destructive/10 hover:text-destructive transition-colors"
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
              className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              title={t("nav.logout")}
              className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/65 hover:bg-destructive/10 hover:text-destructive transition-colors"
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
        "hidden lg:flex shrink-0 flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200 relative",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
