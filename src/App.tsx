import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "./components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Index from "./pages/Index";
import CityScoring from "./pages/CityScoring";
import TeacherProspects from "./pages/TeacherProspects";
import EmailOutreach from "./pages/EmailOutreachV2";
import CandidatePipeline from "./pages/CandidatePipeline";
import Onboarding from "./pages/Onboarding";
import Spec from "./pages/Spec";
import SmartLeadSpec from "./pages/SmartLeadSpec";
import EmailOutreachDocs from "./pages/EmailOutreachDocs";
import UserGuide from "./pages/UserGuide";
import DemographicsMethodology from "./pages/DemographicsMethodology";
import Methodology from "./pages/Methodology";
import TeamMembers from "./pages/TeamMembers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, refetchOnWindowFocus: true } } });

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/city-scoring" element={<CityScoring />} />
              <Route path="/teacher-prospects" element={<TeacherProspects />} />
              <Route path="/email-outreach" element={<EmailOutreach />} />
              <Route path="/candidate-pipeline" element={<CandidatePipeline />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/settings/team" element={<TeamMembers />} />
              <Route path="/users" element={<TeamMembers />} />
              <Route path="/users-guide" element={<UserGuide />} />
              <Route path="/spec" element={<Spec />} />
              <Route path="/smartlead-spec" element={<SmartLeadSpec />} />
              <Route path="/email-outreach-docs" element={<EmailOutreachDocs />} />
              <Route path="/demographics-methodology" element={<DemographicsMethodology />} />
              <Route path="/methodology" element={<Methodology />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
