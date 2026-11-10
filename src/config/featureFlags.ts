// Central feature flags. Keep these as plain compile-time constants so any
// dead-code branches tree-shake. Flip a value and redeploy to enable/disable.

// Optional one-time $297 Launch Package add-on.
// Enabled as an optional assisted launch, never required to publish.
// When this is false:
//   - The Pricing page hides the Launch Package add-on column and checkbox.
//   - Signup's checkout call ignores any stale revvin_addon_launch session flag.
// The Stripe price + webhook plumbing remains in place so flipping this to
// true (and redeploying) is the only change needed to re-enable it.
export const LAUNCH_PACKAGE_ENABLED = true;