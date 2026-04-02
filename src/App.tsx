import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "./contexts/LanguageContext";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { AppLayout } from "./components/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PendingApproval from "./pages/PendingApproval";
import RejectedPage from "./pages/RejectedPage";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import ClientOnboarding from "./pages/ClientOnboarding";
import Trucks from "./pages/Trucks";
import Permits from "./pages/Permits";
import Messages from "./pages/Messages";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";
import ReportsPage from "./pages/ReportsPage";
import KanbanPage from "./pages/KanbanPage";
import FinancePage from "./pages/FinancePage";
import AuditPage from "./pages/AuditPage";
import DocumentationPage from "./pages/DocumentationPage";
import PortalLogin from "./pages/portal/PortalLogin";
import PortalLayout from "./pages/portal/PortalLayout";
import PortalDashboard from "./pages/portal/PortalDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="martins-theme">
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <LanguageSwitcher />
        <BrowserRouter>
          <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
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
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/onboarding" element={<ClientOnboarding />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/trucks" element={<Trucks />} />
              <Route path="/permits" element={<Permits />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/tasks" element={<KanbanPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/docs" element={<DocumentationPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
