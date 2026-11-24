import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Whether sending the first launch campaign would still start the free Pro
 * trial. Server-decided (paid Pro, demo and a used trial all answer false);
 * any error hides the note rather than promising a trial.
 */
export function useLaunchTrialAvailable(businessId: string | null | undefined): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!businessId) { setAvailable(false); return; }
    let live = true;
    Promise.resolve()
      .then(() => supabase.rpc("fn_launch_trial_available", { p_business_id: businessId }))
      .then(({ data, error }) => { if (live) setAvailable(!error && data === true); })
      .catch(() => { if (live) setAvailable(false); });
    return () => { live = false; };
  }, [businessId]);
  return available;
}
