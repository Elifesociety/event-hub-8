import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StallAuthProvider } from "@/contexts/StallAuthContext";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import Index from "./pages/Index";
import Programs from "./pages/Programs";
import Team from "./pages/Team";
import FoodCourt from "./pages/FoodCourt";
import Billing from "./pages/Billing";
import Accounts from "./pages/Accounts";
import PhotoGallery from "./pages/PhotoGallery";
import StallLogin from "./pages/StallLogin";
import StallDashboard from "./pages/StallDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import ManageAdmins from "./pages/ManageAdmins";
import PermissionManagement from "./pages/PermissionManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AdminAuthProvider>
      <StallAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/programs" element={<Programs />} />
              <Route path="/team" element={<Team />} />
              <Route path="/food-court" element={<FoodCourt />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/photo-gallery" element={<PhotoGallery />} />
              <Route path="/stall-login" element={<StallLogin />} />
              <Route path="/my-profile" element={<StallDashboard />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/admin/manage-admins" element={<ManageAdmins />} />
              <Route path="/admin/permissions" element={<PermissionManagement />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </StallAuthProvider>
    </AdminAuthProvider>
  </QueryClientProvider>
);

export default App;
