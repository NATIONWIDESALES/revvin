import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type DemoPersona = "business" | "referrer" | "admin" | null;

interface DemoModeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (on: boolean) => void;
  demoPersona: DemoPersona;
  setDemoPersona: (p: DemoPersona) => void;
  showDemoEntry: boolean;
  setShowDemoEntry: (v: boolean) => void;
  completedSteps: Record<string, boolean>;
  completeStep: (step: string) => void;
  resetSteps: () => void;
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemoMode: false,
  toggleDemoMode: () => {},
  setDemoMode: () => {},
  demoPersona: null,
  setDemoPersona: () => {},
  showDemoEntry: false,
  setShowDemoEntry: () => {},
  completedSteps: {},
  completeStep: () => {},
  resetSteps: () => {},
});

export const useDemoMode = () => useContext(DemoModeContext);

export const DemoModeProvider = ({ children }: { children: ReactNode }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoPersona, setDemoPersona] = useState<DemoPersona>(null);
  const [showDemoEntry, setShowDemoEntry] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => {
      if (prev) {
        setDemoPersona(null);
        setCompletedSteps({});
      } else {
        setShowDemoEntry(true);
      }
      return !prev;
    });
  }, []);

  const setDemoMode = useCallback((on: boolean) => {
    setIsDemoMode(on);
    if (!on) {
      setDemoPersona(null);
      setCompletedSteps({});
    }
  }, []);

  const completeStep = useCallback((step: string) => {
    setCompletedSteps(prev => ({ ...prev, [step]: true }));
  }, []);

  const resetSteps = useCallback(() => setCompletedSteps({}), []);

  return (
    <DemoModeContext.Provider value={{ isDemoMode, toggleDemoMode, setDemoMode, demoPersona, setDemoPersona, showDemoEntry, setShowDemoEntry, completedSteps, completeStep, resetSteps }}>
      {children}
    </DemoModeContext.Provider>
  );
};
