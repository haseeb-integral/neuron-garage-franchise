import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/city-scoring": "City Search",
  "/market-validation": "Market Validation",
  "/site-analysis": "Site Analysis",
  "/teacher-prospects": "Teacher Search",
  "/email-outreach": "Email Outreach",
  "/candidate-pipeline": "Candidate Pipeline",
  "/onboarding": "Onboarding",
  "/settings/team": "Team Members",
  "/users": "Team Members",
  "/users-guide": "User's Guide",
  "/spec": "Full Specification",
  "/smartlead-spec": "SmartLead API Spec",
  "/email-outreach-docs": "Outreach Guide",
  "/demographics-methodology": "Demographics Method",
  
  "/scoring-method": "Scoring Method",
};

/**
 * Sets <title> automatically per route, so browser tabs and bookmarks read
 * "City Search · Neuron Garage" instead of the generic site title.
 */
export function useRouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const match =
      TITLES[pathname] ??
      Object.entries(TITLES)
        .filter(([k]) => k !== "/" && pathname.startsWith(k))
        .map(([, v]) => v)[0];
    document.title = match ? `${match} · Neuron Garage` : "Neuron Garage";
  }, [pathname]);
}
