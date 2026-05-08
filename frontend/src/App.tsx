import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { PermissionProvider } from "@/context/PermissionContext";
import { SyncStatusProvider } from "@/context/SyncStatusContext";
import { Navbar } from "@/components/Navbar";
import { NotificationPopups } from "@/components/NotificationPopups";

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
import DeviceSetup from "./pages/DeviceSetup.tsx";


const queryClient = new QueryClient();
const USER_CHANGED_EVENT = "transitlens:user-changed";

const normalizeStoredUserRole = (role: unknown) => {
  if (typeof role !== "string") {
    return "engineer";
  }

  const normalizedRole = role.trim().toLowerCase();

  if (normalizedRole === "admin" || normalizedRole === "manager") {
    return normalizedRole;
  }

  if (normalizedRole === "engineer" || normalizedRole === "technician" || normalizedRole === "user") {
    return "engineer";
  }

  return "engineer";
};

const getStoredUserRole = () => {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) return "engineer";

  try {
    return normalizeStoredUserRole(JSON.parse(storedUser).role);
  } catch {
    return "engineer";
  }
};

const AppRoutes = () => {
  const location = useLocation();
  const hideNavbar = location.pathname === "/";

  return (
    <>
      {!hideNavbar && <Navbar />}
      <NotificationPopups />

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
        <Route path="/device-setup" element={<DeviceSetup />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  const [role, setRole] = useState(getStoredUserRole);

  useEffect(() => {
    const syncStoredRole = () => setRole(getStoredUserRole());

    window.addEventListener("storage", syncStoredRole);
    window.addEventListener(USER_CHANGED_EVENT, syncStoredRole);

    return () => {
      window.removeEventListener("storage", syncStoredRole);
      window.removeEventListener(USER_CHANGED_EVENT, syncStoredRole);
    };
  }, []);

  return (
    <AccessibilityProvider>
      <PermissionProvider role={role}>
        <QueryClientProvider client={queryClient}>
          <SyncStatusProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner position="top-right" />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </SyncStatusProvider>
        </QueryClientProvider>
      </PermissionProvider>
    </AccessibilityProvider>
  );
};

export default App;
