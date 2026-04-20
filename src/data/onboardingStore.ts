import { Franchisee, STEPS } from "./onboardingData";

/**
 * Lightweight module-level store that lets one page (Candidate Pipeline)
 * push a new onboarding record that another page (Onboarding) will pick up
 * the next time it mounts. Subscribers are notified via a custom event.
 */
const PENDING_KEY = "ng:pending-onboardings";
const EVENT_NAME = "ng:onboarding-added";

const buildEmptyStepData = () => {
  const out: Record<number, Franchisee["stepData"][number]> = {} as Franchisee["stepData"];
  STEPS.forEach((s) => {
    out[s.id] = {
      tasks: s.defaultTasks.map((t, i) => ({
        id: `t-${s.id}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: t,
        done: false,
      })),
      form: {},
      files: [],
      notes: "",
    };
  });
  return out;
};

export function buildFranchiseeFromCandidate(args: {
  name: string;
  city: string;
  state: string;
  email?: string;
  phone?: string;
}): Franchisee {
  const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const today = new Date().toISOString().slice(0, 10);
  return {
    id,
    name: args.name,
    city: args.city,
    state: args.state,
    email: args.email ?? "",
    phone: args.phone ?? "",
    currentStep: 1,
    daysElapsed: 0,
    status: "on_track",
    startDate: today,
    stepData: buildEmptyStepData(),
    activity: [
      {
        id: `a-${Date.now()}`,
        type: "note",
        author: "System",
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
        content: "Onboarding started from Candidate Pipeline.",
      },
    ],
    comms: [
      { key: "welcome", name: "Welcome Email", triggerLabel: "After Step 1", sent: false },
      { key: "roadmap", name: "Process Roadmap", triggerLabel: "After Step 2", sent: false },
      { key: "market", name: "Market Analysis", triggerLabel: "After Step 3", sent: false },
      { key: "fdd", name: "FDD Document", triggerLabel: "After Step 4", sent: false },
      { key: "awarded", name: "Congratulations / Franchise Awarded", triggerLabel: "After Step 6", sent: false },
      { key: "donut", name: "Donut Delivery Note + Onboarding Access", triggerLabel: "After Step 7", sent: false },
    ],
  };
}

export function queueOnboarding(franchisee: Franchisee) {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    const list: Franchisee[] = raw ? JSON.parse(raw) : [];
    list.push(franchisee);
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

export function consumePendingOnboardings(): Franchisee[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    sessionStorage.removeItem(PENDING_KEY);
    return JSON.parse(raw) as Franchisee[];
  } catch {
    return [];
  }
}

export function onOnboardingAdded(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
