import { Check } from "lucide-react";
import type { PlanFeature } from "@/config/planFeatures";

const PlanFeatureList = ({ features }: { features: readonly PlanFeature[] }) => (
  <ul className="mt-6 space-y-2.5 border-t border-border pt-6">
    {features.map((feature) => (
      <li key={feature.label} className="flex items-start gap-2.5 text-sm text-foreground">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span><span className="font-medium">{feature.label}.</span> {feature.description}</span>
      </li>
    ))}
  </ul>
);

export default PlanFeatureList;