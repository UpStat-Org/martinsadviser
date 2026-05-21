import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "./contexts/LanguageContext";
import { OrgProvider } from "./contexts/OrgContext";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { AppLayout } from "./components/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FeatureGate } from "./components/FeatureGate";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { TruckLoadingScreen } from "./components/TruckLoadingScreen";
import { useAuth } from "./hooks/useAuth";
import { getHostnameOrg } from "./lib/orgHost";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PendingApproval from "./pages/PendingApproval";
import RejectedPage from "./pages/RejectedPage";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import ClientOnboarding from "./pages/ClientOnboarding";
import Trucks from "./pages/Trucks";
import TruckDetail from "./pages/TruckDetail";
import Permits from "./pages/Permits";
import PermitDetail from "./pages/PermitDetail";
import Messages from "./pages/Messages";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";
import ReportsPage from "./pages/ReportsPage";
import KanbanPage from "./pages/KanbanPage";
import FinancePage from "./pages/FinancePage";
import InvoiceDetail from "./pages/InvoiceDetail";
import AuditPage from "./pages/AuditPage";
import DocumentationPage from "./pages/DocumentationPage";
import ComplianceCalendarPage from "./pages/ComplianceCalendarPage";
import DrugTestingPage from "./pages/DrugTestingPage";
import HvutPage from "./pages/HvutPage";
import IftaPage from "./pages/IftaPage";
import IftaRatesAdminPage from "./pages/IftaRatesAdminPage";
import IrpPage from "./pages/IrpPage";
import MyDeskPage from "./pages/MyDeskPage";
import SuperAdmin from "./pages/SuperAdmin";
import StartOrg from "./pages/StartOrg";
import InviteAccept from "./pages/InviteAccept";
import WorkloadPage from "./pages/WorkloadPage";
import PortalLogin from "./pages/portal/PortalLogin";
import PortalLayout from "./pages/portal/PortalLayout";
import PortalDashboard from "./pages/portal/PortalDashboard";
import LandingPage from "./pages/LandingPage";

const queryClient = new QueryClient();

// `/` is host-aware:
//   - Apex / dev host + signed-out visitor → marketing landing page
//   - Tenant subdomain, or signed-in user → forward to the app dashboard
// `/dashboard` stays protected so the post-login redirect always lands somewhere
// authenticated.
function HomeIndex() {
  const { user, loading } = useAuth();
  const host = getHostnameOrg();
  const isApex = !host.slug || host.isDev;

  if (loading) return <TruckLoadingScreen />;
  if (isApex && !user) return <LandingPage />;
  return <Navigate to="/dashboard" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="martins-theme">
    <LanguageProvider>
      <OrgProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <LanguageSwitcher />
        <BrowserRouter>
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomeIndex />} />
            <Route path="/lp" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/start" element={<StartOrg />} />
            <Route path="/invite/:token" element={<InviteAccept />} />
            <Route path="/pending" element={<PendingApproval />} />
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<PortalDashboard />} />
            </Route>
            <Route path="/rejected" element={<RejectedPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my" element={<MyDeskPage />} />
              <Route path="/workload" element={<WorkloadPage />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/onboarding" element={<ClientOnboarding />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/trucks" element={<Trucks />} />
              <Route path="/trucks/:id" element={<TruckDetail />} />
              <Route path="/permits" element={<Permits />} />
              <Route path="/permits/:id" element={<PermitDetail />} />
              <Route path="/messages" element={<FeatureGate flag="messages"><Messages /></FeatureGate>} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/tasks" element={<KanbanPage />} />
              <Route path="/calendar" element={<FeatureGate flag="calendar"><CalendarPage /></FeatureGate>} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/finance" element={<FeatureGate flag="finance"><FinancePage /></FeatureGate>} />
              <Route path="/finance/:id" element={<FeatureGate flag="finance"><InvoiceDetail /></FeatureGate>} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/audit" element={<FeatureGate flag="audit_log"><AuditPage /></FeatureGate>} />
              <Route path="/docs" element={<DocumentationPage />} />
              <Route path="/compliance-calendar" element={<ComplianceCalendarPage />} />
              <Route path="/drug-testing" element={<DrugTestingPage />} />
              <Route path="/hvut" element={<HvutPage />} />
              <Route path="/ifta" element={<IftaPage />} />
              <Route path="/admin/ifta-rates" element={<IftaRatesAdminPage />} />
              <Route path="/irp" element={<IrpPage />} />
              <Route path="/super-admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
      </OrgProvider>
    </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
