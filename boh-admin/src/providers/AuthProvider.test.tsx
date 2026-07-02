import { act, render, screen } from "@testing-library/react";

import { AuthProvider, useAuth } from "./AuthProvider";

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  return {
    single,
    getSession: vi.fn(),
    onAuthStateChange: vi.fn((_callback: (event: string, session: unknown) => void) => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single })),
      })),
    })),
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
    from: mocks.from,
  },
}));

function Probe() {
  const { status, role } = useAuth();
  return <div>{`${status}:${role ?? "none"}`}</div>;
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

const session = { user: { id: "user-1" } };

beforeEach(() => {
  vi.clearAllMocks();
});

test("no session resolves to signed-out", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  renderProbe();
  expect(await screen.findByText("signed-out:none")).toBeInTheDocument();
});

test("staff session resolves the role", async () => {
  mocks.getSession.mockResolvedValue({ data: { session } });
  mocks.single.mockResolvedValue({ data: { role: "tarryn" }, error: null });
  renderProbe();
  expect(await screen.findByText("staff:tarryn")).toBeInTheDocument();
});

test("non-staff session is signed out with not-staff status", async () => {
  mocks.getSession.mockResolvedValue({ data: { session } });
  mocks.single.mockResolvedValue({ data: { role: "user" }, error: null });
  renderProbe();
  expect(await screen.findByText("not-staff:none")).toBeInTheDocument();
  expect(mocks.signOut).toHaveBeenCalled();
});

test("not-staff survives the sign-out null-session event", async () => {
  mocks.getSession.mockResolvedValue({ data: { session } });
  mocks.single.mockResolvedValue({ data: { role: "user" }, error: null });
  renderProbe();
  expect(await screen.findByText("not-staff:none")).toBeInTheDocument();

  const callback = mocks.onAuthStateChange.mock.calls[0][0];
  await act(async () => {
    callback("SIGNED_OUT", null);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(screen.getByText("not-staff:none")).toBeInTheDocument();
});
