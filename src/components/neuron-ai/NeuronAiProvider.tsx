import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// ============================================================================
// Neuron AI Provider — global state for the assistant.
//   - open/close state
//   - keyboard shortcut (Cmd/Ctrl+K)
//   - screen-context registry: each page calls setScreenContext({ route, state })
//     so the assistant always knows the live filters/selection.
// ============================================================================

export type ScreenContext = {
  route: string;
  state: Record<string, unknown>;
};

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  screenContext: ScreenContext;
  setScreenContext: (c: ScreenContext) => void;
};

const NeuronAiCtx = createContext<Ctx | null>(null);

export function NeuronAiProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [screenContext, setScreenContextState] = useState<ScreenContext>({
    route: typeof window !== "undefined" ? window.location.pathname : "/",
    state: {},
  });

  // Stable setter so child useEffects don't loop.
  const setScreenContext = useCallback((c: ScreenContext) => {
    setScreenContextState((prev) => {
      // Shallow-equal route + JSON-equal state to skip no-op updates.
      if (prev.route === c.route && JSON.stringify(prev.state) === JSON.stringify(c.state)) {
        return prev;
      }
      return c;
    });
  }, []);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const value = useMemo<Ctx>(
    () => ({ open, setOpen, toggle, screenContext, setScreenContext }),
    [open, toggle, screenContext, setScreenContext],
  );

  return <NeuronAiCtx.Provider value={value}>{children}</NeuronAiCtx.Provider>;
}

const NOOP_CTX: Ctx = {
  open: false,
  setOpen: () => {},
  toggle: () => {},
  screenContext: { route: "/", state: {} },
  setScreenContext: () => {},
};

export function useNeuronAi() {
  const c = useContext(NeuronAiCtx);
  // Fallback to a no-op context if used outside the provider (e.g. during
  // HMR or in routes mounted before the provider wraps them). Prevents
  // a hard crash and a blank screen.
  if (!c) {
    if (typeof console !== "undefined") {
      console.warn("useNeuronAi used outside <NeuronAiProvider> — using no-op context.");
    }
    return NOOP_CTX;
  }
  return c;
}

/** Per-page hook: each main screen calls this once with its current state. */
export function useRegisterScreenContext(route: string, state: Record<string, unknown>) {
  const { setScreenContext } = useNeuronAi();
  // Stringify so deep changes trigger; cheap because pages call this with small objects.
  const key = JSON.stringify(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setScreenContext({ route, state }); }, [route, key]);
}
