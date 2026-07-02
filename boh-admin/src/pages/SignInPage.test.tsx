import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { text } from "@/constants/text";

import { SignInPage } from "./SignInPage";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
}));

vi.mock("@/providers/AuthProvider", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signInWithOAuth: mocks.signInWithOAuth } },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SignInPage />
    </MemoryRouter>,
  );
}

test("clicking the button starts Google OAuth", async () => {
  mocks.useAuth.mockReturnValue({ status: "signed-out" });
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: text.signIn.googleButton }));
  expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
});

test("not-staff shows the admins-only message", () => {
  mocks.useAuth.mockReturnValue({ status: "not-staff" });
  renderPage();
  expect(screen.getByText(text.signIn.adminsOnly)).toBeInTheDocument();
});

test("signed-out does not show the admins-only message", () => {
  mocks.useAuth.mockReturnValue({ status: "signed-out" });
  renderPage();
  expect(screen.queryByText(text.signIn.adminsOnly)).not.toBeInTheDocument();
});
