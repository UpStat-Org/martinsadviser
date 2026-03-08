import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { GlobalSearch } from "./GlobalSearch";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto pl-10 lg:pl-0">
            <GlobalSearch />
          </div>
        </div>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
