import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "./components/AppLayout";
import { NeuronAiProvider } from "./components/neuron-ai/NeuronAiProvider";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Index from "./pages/Index";
const CityScoring = lazy(() => import("./pages/CityScoring"));
const TeacherProspects = lazy(() => import("./pages/TeacherProspects"));
const EmailOutreach = lazy(() => import("./pages/EmailOutreachV2"));
const CandidatePipeline = lazy(() => import("./pages/CandidatePipeline"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Spec = lazy(() => import("./pages/Spec"));
const SmartLeadSpec = lazy(() => import("./pages/SmartLeadSpec"));
const EmailOutreachDocs = lazy(() => import("./pages/EmailOutreachDocs"));
const UserGuide = lazy(() => import("./pages/UserGuide"));
const DemographicsMethodology = lazy(() => import("./pages/DemographicsMethodology"));
const Methodology = lazy(() => import("./pages/Methodology"));
const ScoringMethod = lazy(() => import("./pages/ScoringMethod"));
const DbHealth = lazy(() => import("./pages/DbHealth"));
const Observability = lazy(() => import("./pages/Observability"));
const ObservabilityGuide = lazy(() => import("./pages/ObservabilityGuide"));
const ObservabilitySpec = lazy(() => import("./pages/ObservabilitySpec"));
const SystemOverview = lazy(() => import("./pages/SystemOverview"));
const PromptsAndAiWorkflows = lazy(() => import("./pages/PromptsAndAiWorkflows"));
const ApisAndDataSources = lazy(() => import("./pages/ApisAndDataSources"));
const Guardrails = lazy(() => import("./pages/Guardrails"));


const TeamMembers = lazy(() => import("./pages/TeamMembers"));
const Handover = lazy(() => import("./pages/Handover"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, refetchOnWindowFocus: false } } });

const RouteFallback = () => <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NeuronAiProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Index />} />
                <Route path="/city-scoring" element={<CityScoring />} />
                <Route path="/teacher-prospects" element={<TeacherProspects />} />
                <Route path="/email-outreach" element={<EmailOutreach />} />
                <Route path="/candidate-pipeline" element={<CandidatePipeline />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/settings/team" element={<TeamMembers />} />
                <Route path="/users" element={<TeamMembers />} />
                <Route path="/handover" element={<Handover />} />
                <Route path="/users-guide" element={<UserGuide />} />
                <Route path="/spec" element={<Spec />} />
                <Route path="/smartlead-spec" element={<SmartLeadSpec />} />
                <Route path="/email-outreach-docs" element={<EmailOutreachDocs />} />
                <Route path="/demographics-methodology" element={<DemographicsMethodology />} />
                <Route path="/methodology" element={<Methodology />} />
                <Route path="/scoring-method" element={<ScoringMethod />} />
                <Route path="/observability" element={<Observability />} />
                <Route path="/observability-guide" element={<ObservabilityGuide />} />
                <Route path="/observability-spec" element={<ObservabilitySpec />} />
                <Route path="/architecture" element={<SystemOverview />} />
                <Route path="/docs/prompts-and-ai-workflows" element={<PromptsAndAiWorkflows />} />
                <Route path="/docs/apis" element={<ApisAndDataSources />} />
                <Route path="/docs/guardrails" element={<Guardrails />} />


                <Route path="/db-health" element={<Observability />} />

              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </NeuronAiProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
