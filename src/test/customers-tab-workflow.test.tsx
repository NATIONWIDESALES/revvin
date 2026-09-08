/**
 * Workflow tests for the Customers tab.
 *
 * Covers the two bugs that a unit test of the parser cannot catch:
 *  1. Upload -> preview -> insert payload. A quoted comma in a name must reach
 *     the insert exactly as typed. The old code reparsed a joined string and
 *     turned "Smith, John" into "Smith".
 *  2. The guided run. Confirming A then tapping Next must land on B, not C. The
 *     old code indexed the live shrinking pending array.
 *
 * The database is mocked. Nothing here sends a message: the confirmation dialog
 * is the only thing that records a send, exactly as in the product.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const inserted: any[] = [];
const updates: { values: any; id?: string }[] = [];

let contactRows: any[] = [];

const makeContact = (id: string, name: string) => ({
  id,
  business_id: "biz-1",
  name,
  email: `${id}@example.com`,
  phone: null,
  status: "pending",
  last_sent_at: null,
  send_channel: null,
  last_job_at: null,
  is_mock: false,
  created_at: `2026-01-0${id.slice(-1)}T00:00:00Z`,
});

vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    const api: any = {
      select: () => api,
      eq: (_col: string, val: string) => {
        api._id = val;
        return api;
      },
      order: async () =>
        table === "referral_contacts" ? { data: contactRows, error: null } : { data: [], error: null },
      insert: async (rows: any) => {
        inserted.push(rows);
        return { data: null, error: null };
      },
      update: (values: any) => {
        const u: any = {
          eq: (_c: string, v: string) => {
            updates.push({ values, id: v });
            return u;
          },
          neq: () => u,
          in: () => u,
          then: (res: any) => res({ data: null, error: null, count: 1 }),
        };
        return u;
      },
      delete: () => ({ eq: async () => ({ data: null, error: null }) }),
    };
    // suppressed_contacts read: .select().eq() is awaited directly
    api.then = (res: any) => res({ data: [], error: null });
    return api;
  };
  return { supabase: { from: (t: string) => builder(t), rpc: async () => ({ data: [], error: null }) } };
});

const toasts: any[] = [];
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: (t: any) => toasts.push(t) }),
}));

vi.mock("@/lib/clipboard", () => ({ copyText: async () => true }));
vi.mock("@/lib/track", () => ({ track: () => {} }));

import CustomersTab from "@/components/dashboard/CustomersTab";

// jsdom's Blob has no text(); the component reads the uploaded file with it.
if (typeof Blob !== "undefined" && !Blob.prototype.text) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Blob.prototype as any).text = function () {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(this as Blob);
    });
  };
}

const biz = {
  id: "biz-1",
  name: "Summit Roofing",
  offer_amount: "$150",
  offer_trigger: "a new roof",
} as any;

beforeEach(() => {
  inserted.length = 0;
  updates.length = 0;
  toasts.length = 0;
  contactRows = [];
});

describe("upload -> preview -> insert payload", () => {
  it("carries a quoted comma, an escaped quote and a last job date through unchanged", async () => {
    const user = userEvent.setup();
    render(<CustomersTab biz={biz} publicUrl="https://revvin.co/r/summit" />);
    await waitFor(() => expect(screen.getByLabelText("CSV upload")).toBeTruthy());

    const csv = [
      "Name,Email,Phone,Last Job Date",
      '"Smith, John",john@example.com,555-123-4567,2020-01-15',
      '"Bob ""Bobby"" Jones",bob@example.com,,',
      ",broken@example.com,,",
    ].join("\n");
    const file = new File([csv], "customers.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText("CSV upload") as HTMLInputElement, file);

    // Preview shows the good rows verbatim and reports the bad one by line.
    await waitFor(() => expect(screen.getByText("Smith, John")).toBeTruthy());
    expect(screen.getByText('Bob "Bobby" Jones')).toBeTruthy();
    expect(screen.getByText(/line 4/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Import/i }));

    await waitFor(() => expect(inserted).toHaveLength(1));
    const rows = inserted[0];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      business_id: "biz-1",
      name: "Smith, John",
      email: "john@example.com",
      phone: "555-123-4567",
    });
    expect(rows[0].last_job_at).toMatch(/^2020-01-15T/);
    expect(rows[1].name).toBe('Bob "Bobby" Jones');
  });
});

describe("guided run advances exactly once per contact", () => {
  it("confirming A then tapping Next shows B, not C", async () => {
    contactRows = [makeContact("a1", "Alice A"), makeContact("b2", "Bob B"), makeContact("c3", "Cara C")];
    const user = userEvent.setup();
    render(<CustomersTab biz={biz} publicUrl="https://revvin.co/r/summit" />);

    await waitFor(() => expect(screen.getByText("Alice A")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Send one by one/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Invite Alice/)).toBeTruthy();
    expect(within(dialog).getByText(/1 of 3/)).toBeTruthy();

    // Prepare A on email, then confirm. Preparing alone must record nothing.
    await user.click(within(dialog).getByRole("button", { name: /^Email$/ }));
    expect(updates).toHaveLength(0);
    const confirm = await screen.findByText("Did that send?");
    const confirmDialog = confirm.closest('[role="dialog"]') as HTMLElement;
    await user.click(within(confirmDialog).getByRole("button", { name: /Sent it/i }));

    // A is recorded and the run moved to B.
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toMatchObject({ id: "a1" });
    expect(updates[0].values.status).toBe("sent");
    await waitFor(() => expect(screen.getByText(/Invite Bob/)).toBeTruthy());
    expect(screen.getByText(/2 of 3/)).toBeTruthy();

    // Now the instructed Next: it must reach C, and skipping must record nothing.
    await user.click(screen.getByRole("button", { name: /^Next$/ }));
    await waitFor(() => expect(screen.getByText(/Invite Cara/)).toBeTruthy());
    expect(screen.getByText(/3 of 3/)).toBeTruthy();
    expect(updates).toHaveLength(1);
  });

  it("cancelling the confirmation leaves the contact pending and stays on them", async () => {
    contactRows = [makeContact("a1", "Alice A"), makeContact("b2", "Bob B")];
    const user = userEvent.setup();
    render(<CustomersTab biz={biz} publicUrl="https://revvin.co/r/summit" />);
    await waitFor(() => expect(screen.getByText("Alice A")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Send one by one/i }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^Email$/ }));
    const confirm = await screen.findByText("Did that send?");
    const confirmDialog = confirm.closest('[role="dialog"]') as HTMLElement;
    await user.click(within(confirmDialog).getByRole("button", { name: /Not yet/i }));

    expect(updates).toHaveLength(0);
    await waitFor(() => expect(screen.getByText(/Invite Alice/)).toBeTruthy());
    expect(screen.getByText(/1 of 2/)).toBeTruthy();
  });
});
