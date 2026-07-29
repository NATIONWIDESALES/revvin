import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Star, MessageSquare } from "lucide-react";

// Customer-facing landing for the "how did we do" link in a review request.
// The customer tells us themselves whether they were happy. Revvin does not
// read, scrape or infer review ratings, and nothing here changes which review
// link anyone was sent: every customer got the same public one.

interface Result {
  business_name: string | null;
  slug: string | null;
  google_review_url: string | null;
  first_name: string | null;
  signal: string | null;
}

const Feedback = () => {
  const { token } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const [result, setResult] = useState<Result | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid">("loading");
  const [answered, setAnswered] = useState(false);

  const record = async (happy: boolean) => {
    if (!token) return;
    setState("loading");
    const { data, error } = await supabase.rpc("fn_record_satisfaction", {
      p_token: token,
      p_happy: happy,
    });
    if (error || !data) {
      setState("invalid");
      return;
    }
    setResult(data as unknown as Result);
    setAnswered(true);
    setState("ready");
  };

  useEffect(() => {
    const preset = params.get("happy");
    if (preset === "1") record(true);
    else if (preset === "0") record(false);
    else setState("ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (state === "loading") {
    return (
      <div className="mx-auto flex max-w-md items-center justify-center px-6 py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-xl font-semibold text-foreground">This link is not valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have expired. If you meant to leave feedback, replying to the email you received works just as well.
        </p>
      </div>
    );
  }

  if (!answered) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-xl font-semibold text-foreground">How did the job go?</h1>
        <p className="mt-2 text-sm text-muted-foreground">Honest answers only. Both are useful.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => record(true)}>I was happy</Button>
          <Button variant="outline" onClick={() => record(false)}>Something was not right</Button>
        </div>
      </div>
    );
  }

  const happy = result?.signal === "happy";
  const name = result?.business_name ?? "the business";

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-xl font-semibold text-foreground">
        {happy ? "Thank you, that means a lot" : "Thank you for telling us"}
      </h1>
      {happy ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            If you have another minute, a public review helps other people decide who to call.
          </p>
          {result?.google_review_url && (
            <Button className="mt-6" asChild>
              <a href={result.google_review_url} target="_blank" rel="noopener noreferrer">
                <Star className="mr-2 h-3.5 w-3.5" /> Leave a review
              </a>
            </Button>
          )}
          {result?.slug && (
            <div className="mt-4">
              <Button variant="outline" asChild>
                <a href={`/r/${result.slug}`}>
                  <MessageSquare className="mr-2 h-3.5 w-3.5" /> Refer someone to {name}
                </a>
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {name} has been told so they can put it right. You can reply to the email you received to add detail.
        </p>
      )}
    </div>
  );
};

export default Feedback;
