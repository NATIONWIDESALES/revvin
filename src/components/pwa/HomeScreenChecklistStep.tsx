import { useIsMobile } from "@/hooks/use-mobile";
import SimpleQRCode from "@/components/marketplace/SimpleQRCode";
import AddToHomeScreen from "@/components/pwa/AddToHomeScreen";
import { INSTALL_COPY } from "@/config/installCopy";

/**
 * The checklist row for adding Revvin to a home screen. A desktop owner cannot
 * do it there, so they get the phone instruction and a QR code to the dashboard.
 */
const HomeScreenChecklistStep = () => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-border bg-background p-2">
          <SimpleQRCode url="https://revvin.co/dashboard" size={84} />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {INSTALL_COPY.desktopStep}
        </p>
      </div>
    );
  }

  return <AddToHomeScreen surface="checklist" />;
};

export default HomeScreenChecklistStep;
