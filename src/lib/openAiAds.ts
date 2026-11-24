/** Reserved for the vendor's approved event snippet. No event transport exists yet. */
export type OpenAiAdEventParams = Readonly<Record<string, string | number | boolean>>;
export function trackOpenAiAdEvent(_name: string, _params: OpenAiAdEventParams = {}): false {
  // TODO: Implement only after the vendor supplies its event API and approved parameters.
  return false;
}