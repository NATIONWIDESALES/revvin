import { describe, it, expect, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";

type Cb = (event: string, session: unknown) => void;
const listeners: Cb[] = [];
const fakeSession = { access_token: "t", user: { id: "u1", email: "a@b.co", user_metadata: {} } };

const fakeClient = {
  auth: {
    onAuthStateChange: (cb: Cb) => {
      listeners.push(cb);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    getSession: () => Promise.resolve({ data: { session: null } }),
    // Like the real client: the SIGNED_IN event fires before the promise resolves.
    signInWithPassword: async () => {
      listeners.forEach((l) => l("SIGNED_IN", fakeSession));
      return { data: { session: fakeSession }, error: null };
    },
    signOut: async () => {},
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        limit: () => new Promise((r) => setTimeout(() => r({ data: table === "user_roles" ? [{ role: "business" }] : [] }), 30)),
        maybeSingle: () => Promise.resolve({ data: { id: "p1" } }),
      }),
    }),
  }),
};

vi.mock("@/lib/supabaseLazy", () => ({
  loadSupabase: () => Promise.resolve(fakeClient),
  isMarketingPath: () => false,
  mayHaveSession: () => false,
}));

import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

const seen: string[] = [];
const LocationLog = () => {
  const loc = useLocation();
  seen.push(loc.pathname);
  return null;
};

const LoginPage = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={async () => {
        await fakeClient.auth.signInWithPassword();
        navigate("/dashboard"); // the old same-tick navigation
      }}
    >
      sign in
    </button>
  );
};

describe("sign in once", () => {
  it("shows the spinner then the protected page, never bouncing to /auth", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/auth"]}>
        <AuthProvider>
          <LocationLog />
          <Routes>
            <Route path="/auth" element={<LoginPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><p>dashboard page</p></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    seen.length = 0;

    await act(async () => { fireEvent.click(screen.getByText("sign in")); });
    expect(seen.at(-1)).toBe("/dashboard");
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.queryByText("dashboard page")).toBeNull();

    expect(await screen.findByText("dashboard page")).toBeTruthy();
    const afterDashboard = seen.slice(seen.indexOf("/dashboard"));
    expect(afterDashboard).not.toContain("/auth");
  });
});
