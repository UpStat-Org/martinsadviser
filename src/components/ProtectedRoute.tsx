import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TruckLoadingScreen } from "@/components/TruckLoadingScreen";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, approvalStatus } = useAuth();

  if (loading) {
    return <TruckLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (approvalStatus === "pending") {
    return <Navigate to="/pending" replace />;
  }

  if (approvalStatus === "rejected") {
    return <Navigate to="/rejected" replace />;
  }

  return <>{children}</>;
}
