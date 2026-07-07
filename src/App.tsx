import { Suspense } from "react";
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
import { lazyWithPreload } from "./lib/lazyWithPreload";
import { registerRoutePrefetch } from "./lib/routePrefetch";
import { RouteSkeleton } from "./components/RouteSkeleton";

const CityScoring = lazyWithPreload(() => import("./pages/CityScoring"));
const MarketValidation = lazyWithPreload(() => import("./pages/MarketValidation"));
const MarketValidationRollout = lazyWithPreload(() => import("./pages/MarketValidationRollout"));
const CityCompetitors = lazyWithPreload(() => import("./pages/CityCompetitors"));
const ProviderEvidence = lazyWithPreload(() => import("./pages/ProviderEvidence"));
const SiteAnalysis = lazyWithPreload(() => import("./pages/SiteAnalysis"));
const TeacherProspects = lazyWithPreload(() => import("./pages/TeacherProspects"));
const EmailOutreach = lazyWithPreload(() => import("./pages/EmailOutreachV2"));
const CandidatePipeline = lazyWithPreload(() => import("./pages/CandidatePipeline"));
const Onboarding = lazyWithPreload(() => import("./pages/Onboarding"));
const Spec = lazyWithPreload(() => import("./pages/Spec"));
const SmartLeadSpec = lazyWithPreload(() => import("./pages/SmartLeadSpec"));
const EmailOutreachDocs = lazyWithPreload(() => import("./pages/EmailOutreachDocs"));
const UserGuide = lazyWithPreload(() => import("./pages/UserGuide"));
const DemographicsMethodology = lazyWithPreload(() => import("./pages/DemographicsMethodology"));

const MVSMethodology = lazyWithPreload(() => import("./pages/MVSMethodology"));
const MVSSpec = lazyWithPreload(() => import("./pages/MVSSpec"));
const MVSQAQueue = lazyWithPreload(() => import("./pages/MVSQAQueue"));
const CitySearchSpec = lazyWithPreload(() => import("./pages/CitySearchSpec"));
const CitySearchUsersGuide = lazyWithPreload(() => import("./pages/CitySearchUsersGuide"));
const MarketBrief = lazyWithPreload(() => import("./pages/MarketBrief"));
const SiteBrief = lazyWithPreload(() => import("./pages/SiteBrief"));


const SASMethodology = lazyWithPreload(() => import("./pages/SASMethodology"));
const CandidatePipelineMethodology = lazyWithPreload(() => import("./pages/CandidatePipelineMethodology"));
const ScoringMethod = lazyWithPreload(() => import("./pages/ScoringMethod"));
const DbHealth = lazyWithPreload(() => import("./pages/DbHealth"));
const Observability = lazyWithPreload(() => import("./pages/Observability"));
const ObservabilityGuide = lazyWithPreload(() => import("./pages/ObservabilityGuide"));
const ObservabilitySpec = lazyWithPreload(() => import("./pages/ObservabilitySpec"));
const SystemOverview = lazyWithPreload(() => import("./pages/SystemOverview"));
const PromptsAndAiWorkflows = lazyWithPreload(() => import("./pages/PromptsAndAiWorkflows"));
const ApisAndDataSources = lazyWithPreload(() => import("./pages/ApisAndDataSources"));
const Guardrails = lazyWithPreload(() => import("./pages/Guardrails"));
const TeamMembers = lazyWithPreload(() => import("./pages/TeamMembers"));
const Handover = lazyWithPreload(() => import("./pages/Handover"));
const Glossary = lazyWithPreload(() => import("./pages/Glossary"));
const Unsubscribe = lazyWithPreload(() => import("./pages/Unsubscribe"));
const NotFound = lazyWithPreload(() => import("./pages/NotFound"));

// Register route -> preload mapping for hover/idle prefetch.
registerRoutePrefetch("/city-scoring", CityScoring.preload);
registerRoutePrefetch("/market-validation", MarketValidation.preload);
registerRoutePrefetch("/site-analysis", SiteAnalysis.preload);
registerRoutePrefetch("/teacher-prospects", TeacherProspects.preload);
registerRoutePrefetch("/email-outreach", EmailOutreach.preload);
registerRoutePrefetch("/candidate-pipeline", CandidatePipeline.preload);
registerRoutePrefetch("/onboarding", Onboarding.preload);
registerRoutePrefetch("/settings/team", TeamMembers.preload);
registerRoutePrefetch("/users", TeamMembers.preload);
registerRoutePrefetch("/handover", Handover.preload);
registerRoutePrefetch("/users-guide", UserGuide.preload);
registerRoutePrefetch("/spec", Spec.preload);
registerRoutePrefetch("/city-search-spec", CitySearchSpec.preload);
registerRoutePrefetch("/city-search-guide", CitySearchUsersGuide.preload);
registerRoutePrefetch("/smartlead-spec", SmartLeadSpec.preload);
registerRoutePrefetch("/email-outreach-docs", EmailOutreachDocs.preload);
registerRoutePrefetch("/demographics-methodology", DemographicsMethodology.preload);

registerRoutePrefetch("/mvs-methodology", MVSMethodology.preload);
registerRoutePrefetch("/mvs-spec", MVSSpec.preload);
registerRoutePrefetch("/mvs-qa-queue", MVSQAQueue.preload);

registerRoutePrefetch("/sas-methodology", SASMethodology.preload);
registerRoutePrefetch("/candidate-pipeline-methodology", CandidatePipelineMethodology.preload);
registerRoutePrefetch("/scoring-method", ScoringMethod.preload);
registerRoutePrefetch("/observability", Observability.preload);
registerRoutePrefetch("/observability-guide", ObservabilityGuide.preload);
registerRoutePrefetch("/observability-spec", ObservabilitySpec.preload);
registerRoutePrefetch("/architecture", SystemOverview.preload);
registerRoutePrefetch("/docs/prompts-and-ai-workflows", PromptsAndAiWorkflows.preload);
registerRoutePrefetch("/docs/apis", ApisAndDataSources.preload);
registerRoutePrefetch("/docs/guardrails", Guardrails.preload);
registerRoutePrefetch("/db-health", Observability.preload);
registerRoutePrefetch("/glossary", Glossary.preload);

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, refetchOnWindowFocus: false } } });

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NeuronAiProvider>
          <Suspense fallback={<RouteSkeleton />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Index />} />
                <Route path="/city-scoring" element={<CityScoring />} />
                <Route path="/market-validation" element={<MarketValidation />} />
                <Route path="/market-validation/rollout" element={<MarketValidationRollout />} />
                <Route path="/market-validation/competitors" element={<CityCompetitors />} />
                <Route path="/market-validation/evidence" element={<ProviderEvidence />} />
                <Route path="/site-analysis" element={<SiteAnalysis />} />
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
                
                <Route path="/mvs-methodology" element={<MVSMethodology />} />
                <Route path="/mvs-spec" element={<MVSSpec />} />
                <Route path="/mvs-qa-queue" element={<MVSQAQueue />} />
                <Route path="/city-search-spec" element={<CitySearchSpec />} />
                <Route path="/city-search-guide" element={<CitySearchUsersGuide />} />
                <Route path="/market-brief" element={<MarketBrief />} />
                <Route path="/sas-brief" element={<SiteBrief />} />
                
                
                <Route path="/sas-methodology" element={<SASMethodology />} />
                <Route path="/candidate-pipeline-methodology" element={<CandidatePipelineMethodology />} />
                <Route path="/scoring-method" element={<ScoringMethod />} />
                <Route path="/glossary" element={<Glossary />} />
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
