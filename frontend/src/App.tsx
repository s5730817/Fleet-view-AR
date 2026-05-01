import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { PermissionProvider } from "@/context/PermissionContext";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import BusDetail from "./pages/BusDetail.tsx";
import ARMode from "./pages/ARMode.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

//Retrieves the current user's role from local Storage.
const getStoredUserRole = () => {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return "user";
  }

  try {
    return JSON.parse(storedUser).role || "user";
  } catch {
    return "user";
  }
};

const App = () => (
  <AccessibilityProvider>
    <PermissionProvider role={getStoredUserRole()}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/bus/:id" element={<BusDetail />} />
              <Route path="/ar" element={<ARMode />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </PermissionProvider>
  </AccessibilityProvider>
);

export default App;
