import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "./components/AppLayout";
import Index from "./pages/Index";
import CityScoring from "./pages/CityScoring";
import TeacherProspects from "./pages/TeacherProspects";
import CandidatePipeline from "./pages/CandidatePipeline";
import Onboarding from "./pages/Onboarding";
import Spec from "./pages/Spec";
import UserGuide from "./pages/UserGuide";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/city-scoring" element={<CityScoring />} />
            <Route path="/teacher-prospects" element={<TeacherProspects />} />
            <Route path="/candidate-pipeline" element={<CandidatePipeline />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/spec" element={<Spec />} />
            <Route path="/user-guide" element={<UserGuide />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
