# Customer workflow addition — pending review

`20260908_contact_eligibility.sql` supplies the helper called by `contactEligibility.ts`. It is a separate migration addition; keep the corrected release-1 backend SQL and worker/payment patch intact.

The helper requires a signed-in owner of the requested business. It exposes only suppressed addresses already in that business's existing contacts, with no reasons, metadata or global list access. It does not take an arbitrary email list. Existing table policies stay intact. Database administrators must own the security-definer function; do not transfer ownership to an untrusted role.

The client pauses email if this helper is missing or unavailable, while preserving an eligible text channel. This gate applies at draft preparation and at confirmation. A recorded opt-out is never overwritten. The dashboard uses returned database rows before displaying a send confirmation or writing history; a zero-row update is not success. Personal sends remain owner-confirmed activity, not delivery proof. Status and history writes are separate: a history failure is visibly reported without falsely undoing the saved status.

Do not apply SQL, deploy functions, or publish automatically. Review the combined patch and run isolated tests first. For rollback, revert the client only to a version that also pauses unchecked email. Leave the narrow helper installed unless its callers have been removed; dropping it safely leaves this client with email paused. No production customer data needs to be deleted.
