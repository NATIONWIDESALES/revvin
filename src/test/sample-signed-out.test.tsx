import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sample from "@/pages/Sample";

(globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

describe("/sample signed out", () => {
  it("renders without crashing", () => {
    render(
      
        <MemoryRouter initialEntries={["/sample"]}>
          <Sample />
        </MemoryRouter>
      ,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });
});
