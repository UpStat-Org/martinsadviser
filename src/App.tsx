import { lazy, Suspense } from "react";
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

// All page modules are code-split. Each route ships only the JS/CSS it
// needs — the initial bundle no longer drags Recharts, the import dialogs'
// xlsx parser, the landing-page 3D scene, or 30+ other route modules.
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const RejectedPage = lazy(() => import("./pages/RejectedPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const ClientOnboarding = lazy(() => import("./pages/ClientOnboarding"));
const Trucks = lazy(() => import("./pages/Trucks"));
const TruckDetail = lazy(() => import("./pages/TruckDetail"));
const DriversPage = lazy(() => import("./pages/DriversPage"));
const DriverDetailPage = lazy(() => import("./pages/DriverDetailPage"));
const Permits = lazy(() => import("./pages/Permits"));
const PermitDetail = lazy(() => import("./pages/PermitDetail"));
const Messages = lazy(() => import("./pages/Messages"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const KanbanPage = lazy(() => import("./pages/KanbanPage"));
const FinancePage = lazy(() => import("./pages/FinancePage"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const DocumentationPage = lazy(() => import("./pages/DocumentationPage"));
const ComplianceCalendarPage = lazy(() => import("./pages/ComplianceCalendarPage"));
const DrugTestingPage = lazy(() => import("./pages/DrugTestingPage"));
const HvutPage = lazy(() => import("./pages/HvutPage"));
const IftaPage = lazy(() => import("./pages/IftaPage"));
const IftaRatesAdminPage = lazy(() => import("./pages/IftaRatesAdminPage"));
const IrpPage = lazy(() => import("./pages/IrpPage"));
const SaferLookupPage = lazy(() => import("./pages/SaferLookupPage"));
const TaskTemplatesPage = lazy(() => import("./pages/TaskTemplatesPage"));
const ProfitPerClientPage = lazy(() => import("./pages/ProfitPerClientPage"));
const MyDeskPage = lazy(() => import("./pages/MyDeskPage"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const StartOrg = lazy(() => import("./pages/StartOrg"));
const InviteAccept = lazy(() => import("./pages/InviteAccept"));
const WorkloadPage = lazy(() => import("./pages/WorkloadPage"));
const PortalLogin = lazy(() => import("./pages/portal/PortalLogin"));
const PortalLayout = lazy(() => import("./pages/portal/PortalLayout"));
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const LandingPage = lazy(() => import("./pages/LandingPage"));

const queryClient = new QueryClient();

// `/` is host-aware:
//   - Apex / dev host + signed-out visitor → marketing landing page
//   - Tenant subdomain, or signed-in user → forward to the app dashboard
// `/dashboard` stays protected so the post-login redirect always lands somewhere
// authenticated.
function HomeIndex() {
  const { user, loading } = useAuth();
  const host = getHostnameOrg();
  const isApex = !host.isStrict;

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
          <Suspense fallback={<TruckLoadingScreen />}>
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
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/drivers/:id" element={<DriverDetailPage />} />
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
              <Route path="/safer-lookup" element={<SaferLookupPage />} />
              <Route path="/admin/task-templates" element={<TaskTemplatesPage />} />
              <Route path="/profit-per-client" element={<ProfitPerClientPage />} />
              <Route path="/super-admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
      </OrgProvider>
    </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
