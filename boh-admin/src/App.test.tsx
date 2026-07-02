import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import { text } from "@/constants/text";

import App from "./App";

const mocks = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("@/providers/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: mocks.useAuth,
}));

test("staff lands on the inbox with full navigation", async () => {
  mocks.useAuth.mockReturnValue({ status: "staff", signOut: vi.fn() });
  window.history.pushState({}, "", "/");
  render(<App />);

  expect(await screen.findByText(text.placeholder.comingSoon)).toBeInTheDocument();

  const labels = [
    text.nav.inbox,
    text.nav.content,
    text.nav.whitelist,
    text.nav.announcements,
    text.nav.moderation,
  ];
  for (const label of labels) {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  }
});

test("signed-out users land on the sign-in page", async () => {
  mocks.useAuth.mockReturnValue({ status: "signed-out", signOut: vi.fn() });
  window.history.pushState({}, "", "/");
  render(<App />);

  expect(
    await screen.findByRole("button", { name: text.signIn.googleButton }),
  ).toBeInTheDocument();
});
