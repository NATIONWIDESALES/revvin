import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface QualificationTooltipProps {
  rules?: string[];
}

const QualificationTooltip = ({ rules }: QualificationTooltipProps) => {
  const displayRules = rules ?? ["Lead must be new (not existing customer)", "Customer must be reachable", "Located in service area"];
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center justify-center rounded-full hover:bg-muted p-0.5 transition-colors" onClick={(e) => e.preventDefault()}>
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] p-3">
        <p className="text-xs font-semibold mb-1.5">Qualification Rules</p>
        <ul className="space-y-1">
          {displayRules.slice(0, 3).map((rule, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span className="text-primary mt-0.5">•</span>
              {rule}
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
};

export default QualificationTooltip;
