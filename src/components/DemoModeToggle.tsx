import { Gamepad2 } from "lucide-react";
import { useDemoMode } from "@/contexts/DemoModeContext";

const DemoModeToggle = () => {
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  return (
    <button
      onClick={toggleDemoMode}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
        isDemoMode
          ? "bg-accent text-accent-foreground shadow-sm"
          : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      title={isDemoMode ? "Demo Mode: ON" : "Demo Mode: OFF"}
    >
      <Gamepad2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Demo {isDemoMode ? "ON" : "OFF"}</span>
    </button>
  );
};

export default DemoModeToggle;
