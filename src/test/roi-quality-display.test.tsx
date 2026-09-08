import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RoiSummaryCard from "@/components/dashboard/RoiSummaryCard";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc,
    from: () => {
      const query = {
        select: () => query, eq: () => query, gte: () => query, lt: () => query,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return query;
    },
  },
}));
afterEach(() => { cleanup(); rpc.mockReset(); });

describe("ROI data quality", () => {
  it.each([
    { unknown_close_date_count: 1, missing_amount_count: 0, text: /no close date on record/ },
    { unknown_close_date_count: 0, missing_amount_count: 1, text: /no job value entered/ },
  ])("keeps quality information visible when arrivals and known revenue are zero", async (quality) => {
    rpc.mockResolvedValue({ data: { leads_total: 0, closed_count: 0, revenue: 0, windowed: true, ...quality }, error: null });
    render(<MemoryRouter><RoiSummaryCard businessId="fixture-business" /></MemoryRouter>);
    expect(await screen.findByText(quality.text)).toBeInTheDocument();
    expect(screen.queryByText("Nothing tracked in this period yet")).not.toBeInTheDocument();
  });
});
