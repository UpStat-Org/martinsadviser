import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, LayoutDashboard, FileCheck, Truck as TruckIcon, LogOut,
  ChevronsLeft, ChevronsRight, Menu, X, Sun, Moon, MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type NavItem = { hash: string; icon: LucideIcon; label: string };

interface PortalSidebarProps {
  companyName: string;
  userEmail?: string | null;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function PortalSidebar({
  companyName,
  userEmail,
  activeSection,
  onSectionChange,
}: PortalSidebarProps) {
  const [collapsed, setCollapsed] = useLocalStorageState("portal-sidebar-collapsed", false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMobileOpen(false); }, [activeSection]);

  const sections = useMemo<{ label: string; items: NavItem[] }[]>(() => [
    {
      label: t("sidebar.section.overview"),
      items: [
        { hash: "overview", icon: LayoutDashboard, label: t("portal.overview") },
      ],
    },
    {
      label: t("sidebar.section.operation"),
      items: [
        { hash: "permits", icon: FileCheck, label: t("portal.yourPermits") },
        { hash: "trucks", icon: TruckIcon, label: t("portal.yourTrucks") },
      ],
    },
  ], [t]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/portal/login");
  };

  const showLabel = !collapsed || isMobile;

  const initials = (companyName || "C")
    .split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "C";

  const renderNavItem = (item: NavItem) => {
    const active = activeSection === item.hash;
    const className = cn(
      "group relative flex items-center gap-2.5 h-8 rounded-md text-[13px] transition-colors w-full text-left",
      collapsed && !isMobile ? "justify-center px-0 mx-1" : "px-2.5",
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
    );
    return (
      <button
        key={item.hash}
        type="button"
        onClick={() => onSectionChange(item.hash)}
        title={collapsed && !isMobile ? item.label : undefined}
        className={className}
      >
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
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand block — client company name + portal badge */}
      <div className={cn(
        "flex items-center gap-2.5 h-14 border-b border-sidebar-border shrink-0",
        collapsed && !isMobile ? "justify-center px-2" : "px-4"
      )}>
        <div className="w-7 h-7 rounded bg-primary flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-primary-foreground" />
        </div>
        {showLabel && (
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-sidebar-foreground truncate leading-tight">
              {companyName}
            </div>
            <div className="text-[10px] text-sidebar-foreground/55 truncate mt-0.5">
              {t("portal.login")}
            </div>
          </div>
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
              title={collapsed && !isMobile ? companyName : undefined}
            >
              <div className="shrink-0 w-7 h-7 rounded bg-secondary text-secondary-foreground flex items-center justify-center text-[11px] font-semibold border border-sidebar-border">
                {initials}
              </div>
              {showLabel && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[12px] font-medium text-sidebar-foreground truncate">
                      {companyName}
                    </div>
                    <div className="text-[10px] text-sidebar-foreground/55 truncate">
                      {userEmail ?? t("portal.readOnly")}
                    </div>
                  </div>
                  <MoreHorizontal className="w-3.5 h-3.5 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-56">
            <DropdownMenuLabel className="text-xs">
              <div className="font-medium">{companyName}</div>
              {userEmail && (
                <div className="text-muted-foreground text-[10px] truncate">{userEmail}</div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark"
                ? <><Sun className="w-3.5 h-3.5 mr-2" /> {t("sidebar.lightMode")}</>
                : <><Moon className="w-3.5 h-3.5 mr-2" /> {t("sidebar.darkMode")}</>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
              <LogOut className="w-3.5 h-3.5 mr-2" /> {t("portal.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Read-only badge */}
      {showLabel && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <Badge variant="outline" className="text-[10px] font-normal w-full justify-center py-1">
            {t("portal.readOnly")}
          </Badge>
        </div>
      )}

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

      {/* Footer */}
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
                onClick={handleLogout}
                title={t("portal.logout")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
              title={t("portal.logout")}
              className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
