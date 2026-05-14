import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_FLAG = "ng:tour-completed-v1";

export interface StartTourOptions {
  onFinish?: () => void;
}

export function startTour(opts: StartTourOptions = {}) {
  const d: Driver = driver({
    showProgress: false,
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 8,
    popoverClass: "ng-driver-popover",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Finish",
    showButtons: ["next", "previous", "close"],
    steps: [
      {
        element: '[data-tour="nav-city-scoring"]',
        popover: {
          title: "Step 1 · City Scoring",
          description:
            "Score U.S. cities and find the best markets for a new Neuron Garage franchise.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="nav-teacher-prospects"]',
        popover: {
          title: "Step 2 · Teacher Search",
          description:
            "Discover elementary school teacher prospects in your top cities.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="nav-candidate-pipeline"]',
        popover: {
          title: "Step 3 · Candidate Pipeline",
          description:
            "Qualify candidates through the 7-step franchisee pipeline.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="nav-onboarding"]',
        popover: {
          title: "Step 4 · Onboarding",
          description:
            "Onboard signed franchisees and launch their first camp or location.",
          side: "right",
          align: "start",
        },
      },
      {
        popover: {
          title: "You're all set 🎉",
          description:
            "Start by scoring your first city to find a great market for a new franchise.",
        },
        // Replace default Done button with a CTA that navigates to City Scoring
        onHighlightStarted: () => {
          // run after popover renders
          setTimeout(() => {
            const doneBtn = document.querySelector<HTMLButtonElement>(
              ".driver-popover-next-btn"
            );
            if (doneBtn) {
              doneBtn.textContent = "Start by scoring your first city →";
              doneBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                d.destroy();
                markTourSeen();
                opts.onFinish?.();
                window.location.assign("/city-scoring");
              };
            }
          }, 0);
        },
      },
    ],
    onDestroyStarted: () => {
      markTourSeen();
      opts.onFinish?.();
      d.destroy();
    },
  });

  d.drive();
}

export function markTourSeen() {
  try {
    localStorage.setItem(TOUR_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(TOUR_FLAG) === "1";
  } catch {
    return false;
  }
}

export function maybeStartTourOnFirstVisit() {
  if (hasSeenTour()) return;
  // Defer slightly so sidebar is mounted
  setTimeout(() => startTour(), 400);
}
