import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { PermissionProvider } from "@/context/PermissionContext";
import { Navbar } from "@/components/Navbar";

import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import BusDetail from "./pages/BusDetail.tsx";
import NotFound from "./pages/NotFound.tsx";
import ARMode from "./pages/ARMode.tsx";
import ToolTracker from "./pages/ToolTracker.tsx";
import MaintenanceReports from "./pages/MaintenanceReport.tsx";
import MyJobs from "./pages/MyJobs.tsx";
import Notifications from "./pages/Notifications.tsx";
import Settings from "./pages/Settings.tsx";
import Summary from "./pages/Summary.tsx";
import Team from "./pages/Team.tsx";


const queryClient = new QueryClient();

const normalizeStoredUserRole = (role: unknown) => {
  if (role === "admin" || role === "manager") {
    return role;
  }

  return "user";
};

const getStoredUserRole = () => {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) return "user";

  try {
    return normalizeStoredUserRole(JSON.parse(storedUser).role);
  } catch {
    return "user";
  }
};

const AppRoutes = () => {
  const location = useLocation();
  const hideNavbar = location.pathname === "/";

  return (
    <>
      {!hideNavbar && <Navbar />}

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Index />} />
        <Route path="/bus/:id" element={<BusDetail />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/tool-tracker" element={<ToolTracker />} />
        <Route path="/maintenance-reports" element={<MaintenanceReports />} />
        <Route path="/ar" element={<ARMode />} />
        <Route path="/jobs" element={<MyJobs />} />
        <Route path="/team" element={<Team />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <AccessibilityProvider>
    <PermissionProvider role={getStoredUserRole()}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </PermissionProvider>
  </AccessibilityProvider>
);

export default App;
