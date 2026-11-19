import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import IntegrationsTab from "@/components/dashboard/IntegrationsTab";

export default function AdvancedSettings({ biz, isPro, initiallyOpen = false }: {
  biz: { id: string; contact_outreach_consent_at: string | null };
  isPro: boolean;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} id="advanced" className="border-t border-border pt-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          Advanced <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <IntegrationsTab biz={biz} isPro={isPro} />
      </CollapsibleContent>
    </Collapsible>
  );
}